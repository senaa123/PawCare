# Backend/app/ai/vision/breed_classifier.py
"""
Cat breed classification using cat_breed_b2_single.onnx (EfficientNet-B2).

Model spec:
    Input:  image  (batch_size, 3, 260, 260)  float32, ImageNet-normalised
    Output: logits (batch_size, 60)           float32, raw logits → softmax

Class labels are loaded from cat_breed_labels.json (the exact training class_to_idx mapping),
so there is zero index drift between the model and our display strings.

Called ONLY during cat enrollment — never on the live camera feed.

Public API:
    classify_breed(image_bytes: bytes) -> BreedResult | None
"""

from __future__ import annotations

import io
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_AI_DIR   = Path(__file__).parents[2] / "ai" / "models"
MODEL_PATH = _AI_DIR / "cat_breed_b2_single.onnx"
LABELS_PATH = _AI_DIR / "cat_breed_labels.json"

# ── Load breed labels from the exact training mapping ─────────────────────────
def _load_labels() -> list[str]:
    """Load class index → breed name from cat_breed_labels.json.
    Falls back to 60 generic Class_N labels if the file is missing.
    """
    if LABELS_PATH.exists():
        with LABELS_PATH.open("r", encoding="utf-8") as f:
            mapping: dict[str, str] = json.load(f)
        # Keys are string integers "0".."59", convert to sorted list
        return [mapping[str(i)] for i in range(len(mapping))]
    logger.warning("breed_classifier: %s not found — using generic class names", LABELS_PATH)
    return [f"Class_{i}" for i in range(60)]

BREED_LABELS: list[str] = _load_labels()

assert len(BREED_LABELS) == 60, (
    f"cat_breed_labels.json has {len(BREED_LABELS)} entries, expected 60"
)

logger.info(
    "breed_classifier: loaded %d breed labels from %s (idx 0=%s … idx 59=%s)",
    len(BREED_LABELS), LABELS_PATH.name, BREED_LABELS[0], BREED_LABELS[-1],
)

# ── Preprocessing constants (ImageNet, EfficientNet-B2 @ 260×260) ─────────────
_IMG_SIZE = 260
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

# ── Lazy-loaded ONNX session ───────────────────────────────────────────────────
_session = None


def _get_session():
    global _session
    if _session is not None:
        return _session
    try:
        import onnxruntime as ort
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        _session = ort.InferenceSession(str(MODEL_PATH), providers=providers)
        ep = _session.get_providers()[0].replace("ExecutionProvider", "")
        logger.info("breed_classifier: ONNX session ready  [provider=%s]", ep)
    except Exception:
        logger.exception("breed_classifier: failed to load ONNX model at %s", MODEL_PATH)
        raise
    return _session


def _preprocess(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes → (1, 3, 260, 260) float32 normalised tensor."""
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((_IMG_SIZE, _IMG_SIZE), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0   # (260, 260, 3) in [0,1]
    arr = arr.transpose(2, 0, 1)                     # (3, 260, 260)
    arr = (arr - _MEAN) / _STD                       # ImageNet-normalised
    return arr[np.newaxis, ...]                       # (1, 3, 260, 260)


# ── Result dataclass ───────────────────────────────────────────────────────────

@dataclass
class BreedResult:
    breed:      str                        # e.g.  "Selkirk Rex"
    confidence: float                      # 0.0 – 1.0  (softmax probability)
    top3:       list[tuple[str, float]]    # top-3 predictions with probabilities


def classify_breed(image_bytes: bytes) -> Optional[BreedResult]:
    """
    Classify a cat's breed from raw image bytes (JPEG / PNG).

    Returns:
        BreedResult   — top-1 breed + confidence + top-3 list
        None          — if the model is unavailable or decoding fails

    Runs synchronously.  Call via asyncio.run_in_executor from async routes.
    """
    try:
        session = _get_session()
        tensor  = _preprocess(image_bytes)

        input_name  = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name

        logits = session.run([output_name], {input_name: tensor})[0]  # (1, 60)
        logits = logits[0]                                              # (60,)

        # Numerically stable softmax
        logits -= logits.max()
        e       = np.exp(logits)
        probs   = e / e.sum()

        # Top-1
        top_idx   = int(np.argmax(probs))
        top_prob  = float(probs[top_idx])
        top_breed = BREED_LABELS[top_idx]

        # Top-3
        top3_idx = np.argsort(probs)[::-1][:3]
        top3     = [(BREED_LABELS[i], float(probs[i])) for i in top3_idx]

        logger.info(
            "breed_classifier: %s (%.1f%%)  |  top3=%s",
            top_breed, top_prob * 100,
            [(b, f"{p:.1%}") for b, p in top3],
        )
        return BreedResult(breed=top_breed, confidence=top_prob, top3=top3)

    except Exception:
        logger.exception("breed_classifier: inference failed")
        return None
