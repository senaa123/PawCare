# Backend/app/ai/vision/face_recognition.py
"""
Cat face embedding extraction using the new Cat FaceNet model
(cat_facenet_final.pt — InceptionResnetV1 backbone, 512-d embedding).

Architecture:
    CatFaceNet
    ├── backbone  : InceptionResnetV1 (classify=True, num_classes=8631)
    └── head      : Linear(512, 61239, bias=False)

Called ONLY during cat enrollment — never from the live camera pipeline.

Public API:
    extract_embedding(image_bytes: bytes) -> np.ndarray   # (512,) float32
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parents[2] / "ai" / "models" / "cat_facenet_final.pt"

# ── Preprocessing — 160×160, normalised to [-1, 1] ────────────────────────────
_IMG_SIZE = 160
_TRANSFORM = transforms.Compose([
    transforms.Resize((_IMG_SIZE, _IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])

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


# ── Lazy-loaded model ─────────────────────────────────────────────────────────
_model:  CatFaceNet | None = None
_device: torch.device | None = None


def _get_model() -> tuple[CatFaceNet, torch.device]:
    global _model, _device
    if _model is not None:
        return _model, _device

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("face_recognition: loading CatFaceNet on %s", _device)

    ckpt = torch.load(str(MODEL_PATH), map_location=_device)

    net = CatFaceNet(embedding_dim=ckpt["embedding_dim"])
    net.load_state_dict(ckpt["model_state"], strict=True)
    net = net.to(_device).eval()

    _model = net
    logger.info("face_recognition: CatFaceNet ready (emb_dim=%d, img=%d×%d)",
                ckpt["embedding_dim"], ckpt["img_size"], ckpt["img_size"])
    return _model, _device


def extract_embedding(image_bytes: bytes) -> np.ndarray:
    """
    Takes raw image bytes (JPEG / PNG), returns a 512-d L2-normalised numpy array.
    Runs synchronously — call via run_in_executor from async routes.
    """
    model, device = _get_model()

    img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _TRANSFORM(img).unsqueeze(0).to(device)   # (1, 3, 160, 160)

    with torch.no_grad():
        emb = model(tensor)                             # (1, 512)
        emb = F.normalize(emb, p=2, dim=1)

    return emb.squeeze(0).cpu().numpy()                 # (512,)