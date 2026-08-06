"""
PawCare local behavior model.
All Ultralytics knowledge lives here. main_camera.py sees only
BehaviorModel, BehaviorDetection, and the two config constants.
"""

import logging
from dataclasses import dataclass
from pathlib import Path

from ultralytics import YOLO

logger = logging.getLogger(__name__)

# ── Behavior model config — owned here, imported by main ──────────────────────
_REPO_ROOT         = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_PATH = _REPO_ROOT / "Backend" / "app" / "ai" / "models" / "behavior_v1.pt"
DEFAULT_CONFIDENCE = 0.55


# ──────────────────────────────────────────────────────────────────────────────
# Result dataclass
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class BehaviorDetection:
    """One detected cat with its behavior from a single frame."""
    track_id:   str
    behavior:   str          # "lying" | "sitting" | "standing"
    confidence: float
    bbox:       list[float]  # [x1, y1, x2, y2] absolute pixels


# ──────────────────────────────────────────────────────────────────────────────
# Model wrapper
# ──────────────────────────────────────────────────────────────────────────────

class BehaviorModel:
    """
    Usage:
        model = BehaviorModel().load()              # uses defaults
        model = BehaviorModel(device="cpu").load()  # override device

        detections = model.track(frame)
        for det in detections:
            print(det.track_id, det.behavior, det.confidence)
    """

    def __init__(
        self,
        model_path: str | Path = DEFAULT_MODEL_PATH,
        device:     str        = "0",
        conf:       float      = DEFAULT_CONFIDENCE,
    ):
        import torch
        self.model_path = Path(model_path)
        if device != "cpu" and not torch.cuda.is_available():
            logger.warning(
                "CUDA device '%s' requested, but PyTorch CUDA is unavailable. Falling back to 'cpu'.",
                device,
            )
            device = "cpu"
        self.device = device
        self.conf   = conf
        self._model = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> "BehaviorModel":
        """Load weights from disk. Call once before the camera loop."""
        self._load_model()
        return self

    def _load_model(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Behavior model not found: {self.model_path}\n"
                "Run the training notebook and export behavior_v1.pt first."
            )
        self._model = YOLO(str(self.model_path))
        logger.info("behavior_model: loaded %s  device=%s", self.model_path.name, self.device)
        logger.info("behavior_model: classes=%s  conf=%.2f", self._model.names, self.conf)

    def has_model(self) -> bool:
        return self._model is not None

    @property
    def names(self) -> dict:
        return self._model.names if self._model is not None else {}

    # ── Inference ─────────────────────────────────────────────────────────────

    def track(self, frame) -> list[BehaviorDetection]:
        """
        Run detection + behavior classification + tracking on one frame.

        Args:
            frame: BGR numpy array from cv2.VideoCapture

        Returns:
            List of BehaviorDetection, one per detected cat.
            Empty list if no cats detected.
        """
        if self._model is None:
            raise RuntimeError("BehaviorModel not loaded — call .load() first.")

        results = self._model.track(
            frame,
            persist = True,
            verbose = False,
            conf    = self.conf,
            device  = self.device,
        )[0]

        if results.boxes is None:
            return []

        return [
            BehaviorDetection(
                track_id   = str(int(box.id[0])) if box.id is not None else "0",
                behavior   = self._model.names[int(box.cls)],
                confidence = float(box.conf),
                bbox       = box.xyxy[0].tolist(),
            )
            for box in results.boxes
        ]