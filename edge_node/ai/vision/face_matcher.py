# edge_node/ai/vision/face_matcher.py
"""
Local face matcher for the edge node.

On startup: downloads all enrolled cat embeddings from the backend.
Per frame:  given a bounding-box crop of a cat, extracts an embedding
            and returns the closest known cat_id + name if similarity
            exceeds the threshold.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import requests
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.65   # cosine similarity — tune up if too many false matches

_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# Path to the same model file used by the backend
_MODEL_PATH = Path(__file__).parents[3] / "Backend" / "app" / "ai" / "models" / "cat_face_model.pth"


@dataclass
class MatchResult:
    cat_id:     str
    name:       str
    similarity: float


class FaceMatcher:
    """
    Usage:
        matcher = FaceMatcher(backend_url, token)
        matcher.load()                        # downloads embeddings
        result = matcher.match(frame, bbox)   # match one detection
    """

    def __init__(self, backend_url: str, token: str):
        self.backend_url = backend_url
        self.token = token

        self._model = None
        self._device = None
        # List of {"cat_id": str, "name": str, "embedding": np.ndarray}
        self._known: list[dict] = []

    # ── setup ─────────────────────────────────────────────────────────────────
    def load(self) -> None:
        self._load_model()
        self._download_embeddings()

    def _load_model(self) -> None:
        import torchvision.models as models
        import torch.nn as nn
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("face_matcher: loading model on %s", self._device)

        self._model = models.resnet18(weights=None)
        self._model.fc = nn.Linear(self._model.fc.in_features, 500)
        state_dict = torch.load(str(_MODEL_PATH), map_location=self._device)
        self._model.load_state_dict(state_dict)
        self._model.fc = nn.Identity()
        self._model = self._model.to(self._device)
        self._model.eval()

    def _download_embeddings(self) -> None:
        try:
            resp = requests.get(
                f"{self.backend_url}/api/v1/cats/embeddings",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            self._known = [
                {
                    "cat_id":    item["cat_id"],
                    "name":      item["name"],
                    "embedding": np.array(item["embedding"], dtype=np.float32),
                }
                for item in data
            ]
            logger.info("face_matcher: loaded %d known cats", len(self._known))
        except Exception as exc:
            logger.warning("face_matcher: failed to download embeddings: %s", exc)
            self._known = []

    def has_known_cats(self) -> bool:
        return len(self._known) > 0

    # ── inference ──────────────────────────────────────────────────────────────
    def match(self, frame_bgr, bbox: list[float]) -> Optional[MatchResult]:
        """
        Crop the cat from the frame using bbox [x1,y1,x2,y2], extract
        embedding, return closest known cat or None if below threshold.
        """
        if not self._known or self._model is None:
            return None

        x1, y1, x2, y2 = [int(v) for v in bbox]
        # Guard against out-of-bound crops
        h, w = frame_bgr.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            return None

        crop_bgr  = frame_bgr[y1:y2, x1:x2]
        crop_rgb  = crop_bgr[:, :, ::-1]           # BGR→RGB (numpy view)
        pil_image = Image.fromarray(crop_rgb)

        tensor = _TRANSFORM(pil_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            embedding = self._model(tensor)
            embedding = F.normalize(embedding, p=2, dim=1)

        query = embedding.squeeze(0).cpu().numpy()  # (512,)

        # Cosine similarity against all known cats
        best_sim   = -1.0
        best_match = None

        for known in self._known:
            sim = float(np.dot(query, known["embedding"]))
            if sim > best_sim:
                best_sim   = sim
                best_match = known

        if best_sim >= MATCH_THRESHOLD and best_match:
            return MatchResult(
                cat_id=best_match["cat_id"],
                name=best_match["name"],
                similarity=best_sim,
            )

        return None