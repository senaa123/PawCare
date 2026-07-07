"""
PawCare Edge AI camera worker.

Architecture:
    Camera → BehaviorModel.track(frame)      (detection + behavior, one pass)
           → FaceMatcher.match(frame, bbox)  (optional identity)
           → send_detection(...)             (POST to FastAPI)
           → WebSocket dashboard
"""

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import cv2

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Auto-load .env
for _env_path in [Path(".env"), REPO_ROOT / "edge_node" / ".env", REPO_ROOT / "Backend" / ".env"]:
    if _env_path.exists():
        for _line in _env_path.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip().strip("'\""))

from edge_node.ai.behavior import (
    BehaviorModel,
    BehaviorDetection,
    DEFAULT_MODEL_PATH,
    DEFAULT_CONFIDENCE,
)

logging.basicConfig(
    level  = logging.INFO,
    format = "%(name)s | %(levelname)s | %(message)s",
)

# ── Camera / network config — not behavior-specific, live here ─────────────────
DEFAULT_BACKEND_URL = "http://localhost:8000"
POST_INTERVAL_SEC   = 1.0

BEHAVIOR_COLORS = {
    "lying":    (0,   200, 255),   # amber
    "sitting":  (0,   255, 100),   # green
    "standing": (255, 100,   0),   # blue
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def get_token(args) -> str:
    import requests
    if args.token:
        return args.token
    print("Logging in...")
    r = requests.post(
        f"{args.backend}/api/v1/auth/login",
        json={"email": args.email, "password": args.password},
        timeout=5,
    )
    r.raise_for_status()
    print("Login successful.")
    return r.json()["access_token"]


def send_detection(
    backend: str,
    token:   str,
    det:     BehaviorDetection,
    cat_id:              str | None   = None,
    identity_confidence: float | None = None,
) -> None:
    import requests
    payload = {
        "label":               "cat",
        "confidence":          round(det.confidence, 3),
        "bbox":                [round(v) for v in det.bbox],
        "track_id":            det.track_id,
        "behavior":            det.behavior,
        "cat_id":              cat_id,
        "identity_confidence": round(identity_confidence, 3) if identity_confidence else None,
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    try:
        requests.post(
            f"{backend}/api/v1/detections/ingest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=2.0,
        ).raise_for_status()
    except Exception as exc:
        logging.getLogger(__name__).warning("Failed to send detection: %s", exc)


def parse_args():
    parser = argparse.ArgumentParser(description="PawCare Edge AI camera worker")
    parser.add_argument("--backend",     default=DEFAULT_BACKEND_URL)
    parser.add_argument("--model",       default=str(DEFAULT_MODEL_PATH))
    parser.add_argument("--camera",      type=int,   default=0)
    parser.add_argument("--confidence",  type=float, default=DEFAULT_CONFIDENCE)
    parser.add_argument("--device",      default="0",
                        help="'0' for GPU, 'cpu' for CPU")
    parser.add_argument("--show",        action="store_true",
                        help="Display live preview window")
    parser.add_argument("--token",       default=None)
    parser.add_argument("--email",       default=None)
    parser.add_argument("--password",    default=None)
    parser.add_argument("--enable-face", action="store_true",
                        help="Match detected cats against enrolled embeddings")
    return parser.parse_args()


# ──────────────────────────────────────────────────────────────────────────────
# Main loop
# ──────────────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    if not args.token and not (args.email and args.password):
        print("ERROR: Provide --token OR --email + --password")
        sys.exit(1)

    token = get_token(args)

    # ── Behavior model ─────────────────────────────────────────────────────────
    behavior_model = BehaviorModel(
        model_path = args.model,
        device     = args.device,
        conf       = args.confidence,
    ).load()

    # ── Optional: face recognition ─────────────────────────────────────────────
    face_matcher = None
    if args.enable_face:
        from edge_node.ai.vision.face_matcher import FaceMatcher
        face_matcher = FaceMatcher(args.backend, token)
        face_matcher.load()
        if face_matcher.has_known_cats():
            print("Face recognition enabled — known cats loaded.")
        else:
            print("Face recognition enabled — no enrolled cats yet.")

    # ── Camera ─────────────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print("ERROR: Cannot open camera")
        sys.exit(1)

    print("\nPawCare Edge AI running")
    print(f"Backend : {args.backend}")
    print(f"Camera  : {args.camera}  |  Device: {args.device}")
    print("Press Ctrl+C or Q to stop\n")

    last_post = 0.0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            # ── One call: detection + behavior + tracking ──────────────────────
            detections = behavior_model.track(frame)

            # ── Optional: face match per detected cat ──────────────────────────
            results_out = []
            for det in detections:
                cat_id        = None
                identity_conf = None
                if face_matcher:
                    match = face_matcher.match(frame, det.bbox)
                    if match:
                        cat_id        = match.cat_id
                        identity_conf = match.similarity
                        print(f"  Identified: {match.name} ({match.similarity:.0%})")
                results_out.append((det, cat_id, identity_conf))

            # ── POST to backend (rate-limited) ─────────────────────────────────
            now = time.time()
            if results_out and (now - last_post) >= POST_INTERVAL_SEC:
                for det, cat_id, identity_conf in results_out:
                    line = f"  Cat #{det.track_id}  {det.confidence:.0%}  | {det.behavior}"
                    if cat_id:
                        line += f"  | id: {cat_id}"
                    print(line)
                    send_detection(
                        args.backend, token, det,
                        cat_id              = cat_id,
                        identity_confidence = identity_conf,
                    )
                last_post = now

            # ── Optional live preview ──────────────────────────────────────────
            if args.show:
                for det, cat_id, _ in results_out:
                    x1, y1, x2, y2 = [int(v) for v in det.bbox]
                    color = BEHAVIOR_COLORS.get(det.behavior, (200, 200, 200))
                    if cat_id:
                        color = (0, 100, 255)   # orange = identified cat
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(
                        frame,
                        f"#{det.track_id} {det.behavior} {det.confidence:.0%}",
                        (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2,
                    )
                cv2.imshow("PawCare Edge AI", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()