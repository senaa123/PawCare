import logging
from typing import Dict, Optional
import uuid

logger = logging.getLogger(__name__)


class CatTracker:
    """
    Simple bounding-box IoU tracker.
    Maps detected boxes to known cat track IDs across frames.
    In production, swap for ByteTrack or DeepSORT.
    """

    def __init__(self, iou_threshold: float = 0.4):
        self.iou_threshold = iou_threshold
        self.tracks: Dict[str, dict] = {}

    def update(self, detections: list) -> list[dict]:
        updated = []
        for det in detections:
            track_id = self._match_or_create(det.bbox)
            updated.append({"track_id": track_id, "detection": det})
        return updated

    def _match_or_create(self, bbox: tuple) -> str:
        for track_id, track in self.tracks.items():
            if self._iou(track["bbox"], bbox) >= self.iou_threshold:
                self.tracks[track_id]["bbox"] = bbox
                return track_id
        new_id = str(uuid.uuid4())[:8]
        self.tracks[new_id] = {"bbox": bbox}
        return new_id

    @staticmethod
    def _iou(a: tuple, b: tuple) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        ix = max(0, min(ax2, bx2) - max(ax1, bx1))
        iy = max(0, min(ay2, by2) - max(ay1, by1))
        inter = ix * iy
        union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
        return inter / union if union > 0 else 0.0