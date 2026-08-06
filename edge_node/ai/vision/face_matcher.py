# edge_node/ai/vision/face_matcher.py
"""
Local face matcher for the edge node.

On startup: downloads all enrolled cat embeddings from the backend.
Per frame:  given a bounding-box crop of a cat, extracts a 512-d embedding
            using CatFaceNet (InceptionResnetV1) and returns the closest
            known cat_id + name if cosine similarity exceeds the threshold.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import requests
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

logger = logging.getLogger(__name__)

# Optimal match threshold from model validation
MATCH_THRESHOLD = 0.9569

# ── Preprocessing — 160×160, normalised to [-1, 1] ────────────────────────────
_IMG_SIZE = 160
_TRANSFORM = transforms.Compose([
    transforms.Resize((_IMG_SIZE, _IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])

# Path to model — shared with backend
_MODEL_PATH = Path(__file__).parents[3] / "Backend" / "app" / "ai" / "models" / "cat_facenet_final.pt"


# ── CatFaceNet wrapper — matches checkpoint keys exactly ──────────────────────
class CatFaceNet(nn.Module):
    def __init__(self, embedding_dim: int = 512):
        super().__init__()
        from facenet_pytorch import InceptionResnetV1
        self.backbone = InceptionResnetV1(pretrained=None, classify=True, num_classes=8631)
        self.head = nn.Linear(embedding_dim, 61239, bias=False)

    def forward(self, x):
        self.backbone.classify = False
        return self.backbone(x)     # Returns (B, 512) L2-normalised vector


@dataclass
class MatchResult:
    cat_id:     str
    name:       str
    similarity: float


class FaceMatcher:
    """
    Usage:
        matcher = FaceMatcher(backend_url, token)
        matcher.load()                        # downloads embeddings + loads model
        result = matcher.match(frame, bbox)   # match one detection
    """

    def __init__(self, backend_url: str, token: str):
        self.backend_url = backend_url
        self.token = token

        self._model:  CatFaceNet | None = None
        self._device: torch.device | None = None
        self._known:  list[dict] = []   # [{cat_id, name, embedding: np.ndarray}]

    # ── Setup ──────────────────────────────────────────────────────────────────
    def load(self) -> None:
        self._load_model()
        self._download_embeddings()

    def _load_model(self) -> None:
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("face_matcher: loading CatFaceNet on %s", self._device)

        ckpt = torch.load(str(_MODEL_PATH), map_location=self._device)
        net  = CatFaceNet(embedding_dim=ckpt["embedding_dim"])
        net.load_state_dict(ckpt["model_state"], strict=True)
        self._model = net.to(self._device).eval()
        logger.info("face_matcher: CatFaceNet ready (emb_dim=%d)", ckpt["embedding_dim"])

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

    # ── Inference ──────────────────────────────────────────────────────────────
    def match(self, frame_bgr, bbox: list[float]) -> Optional[MatchResult]:
        """
        Crop the cat from the frame using bbox [x1,y1,x2,y2], extract 512-d
        embedding, return closest known cat or None if below threshold.
        """
        if not self._known or self._model is None:
            return None

        x1, y1, x2, y2 = [int(v) for v in bbox]
        h, w = frame_bgr.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            return None

        crop_w, crop_h = x2 - x1, y2 - y1
        if crop_w < 40 or crop_h < 40:
            return None

        crop_bgr  = frame_bgr[y1:y2, x1:x2]
        # Ignore flat/featureless background crops (low variance)
        if float(np.std(crop_bgr)) < 15.0:
            return None

        crop_rgb  = crop_bgr[:, :, ::-1]           # BGR→RGB
        pil_image = Image.fromarray(crop_rgb)

        tensor = _TRANSFORM(pil_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            emb = self._model(tensor)              # (1, 512)
            emb = F.normalize(emb, p=2, dim=1)

        query = emb.squeeze(0).cpu().numpy()        # (512,)

        # Cosine similarity against all enrolled cats
        best_sim   = -1.0
        best_match = None

        for known in self._known:
            sim = float(np.dot(query, known["embedding"]))
            if sim > best_sim:
                best_sim   = sim
                best_match = known

        if best_sim >= MATCH_THRESHOLD and best_match is not None:
            return MatchResult(
                cat_id     = best_match["cat_id"],
                name       = best_match["name"],
                similarity = best_sim,
            )
        return None