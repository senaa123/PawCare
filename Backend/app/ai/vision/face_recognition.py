# Backend/app/ai/vision/face_recognition.py
"""
Extracts face embeddings from cat images using the trained EfficientNet-B3
model (cat_face_model.pth). Called only from the enrollment endpoint —
never from the live camera pipeline.
"""

import logging
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parents[2] / "ai" / "models" / "cat_face_model.pth"

# ResNet18 standard size
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

_model = None
_device = None


def _get_model():
    global _model, _device
    if _model is not None:
        return _model, _device

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("face_recognition: loading model on %s", _device)

    import torchvision.models as models
    import torch.nn as nn
    _model = models.resnet18(weights=None)
    _model.fc = nn.Linear(_model.fc.in_features, 500)
    state_dict = torch.load(MODEL_PATH, map_location=_device)
    _model.load_state_dict(state_dict)
    _model.fc = nn.Identity()
    _model = _model.to(_device)
    _model.eval()

    logger.info("face_recognition: model ready")
    return _model, _device


def extract_embedding(image_bytes: bytes) -> np.ndarray:
    """
    Takes raw image bytes (JPEG/PNG), returns a normalised 512-d numpy array.
    Runs synchronously — call via run_in_executor from async routes.
    """
    model, device = _get_model()

    img = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGB")
    tensor = _TRANSFORM(img).unsqueeze(0).to(device)   # (1, 3, 300, 300)

    with torch.no_grad():
        embedding = model(tensor)                       # (1, 512)

    # L2-normalise so cosine similarity = dot product
    embedding = F.normalize(embedding, p=2, dim=1)
    return embedding.squeeze(0).cpu().numpy()           # (512,)