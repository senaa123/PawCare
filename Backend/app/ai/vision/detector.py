import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    label: str
    confidence: float
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2


class CatDetector:
    """
    YOLOv8-based cat detector.
    Lazy-loads the model on first use to avoid startup cost.
    """

    def __init__(self):
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                from ultralytics import YOLO
                self._model = YOLO(settings.YOLO_MODEL_PATH)
                logger.info("YOLOv8 model loaded.")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
                raise

    def detect(self, frame: np.ndarray) -> list[Detection]:
        self._load_model()
        results = self._model(frame, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                label = result.names[int(box.cls)]
                confidence = float(box.conf)
                if label == "cat" and confidence >= settings.AI_CONFIDENCE_THRESHOLD:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    detections.append(Detection(label, confidence, (x1, y1, x2, y2)))
        return detections