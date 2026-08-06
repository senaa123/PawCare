# Backend/app/api/routes/cats.py — CHANGED
# Added: POST /{cat_id}/enroll   — upload photos, extract embeddings, save
# Added: GET  /embeddings         — edge node downloads all embeddings on startup

import asyncio
import json
import uuid
import shutil
from pathlib import Path
from typing import List

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile, status, Query
from sqlalchemy import select

from app.api.dependencies import DBSession, CurrentUser
from app.database.models.cat import Cat
from app.database.schemas.cat import CatCreate, CatUpdate, CatOut
from app.services.cat_service import CatService

router = APIRouter()

EMBEDDINGS_DIR = Path("app/ai/models/embeddings")
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_IMAGES_DIR = Path("app/static/cat_images")
PROFILE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# ── existing endpoints (unchanged) ────────────────────────────────────────────

@router.get("/", response_model=List[CatOut])
async def list_cats(current_user: CurrentUser, session: DBSession):
    return await CatService(session).list_cats(current_user.id)


@router.get("/embeddings", response_model=None)
async def get_embeddings(current_user: CurrentUser, session: DBSession):
    """
    Returns all enrolled cat embeddings as JSON so the edge node can
    download them on startup and do local face matching.

    GET /api/v1/cats/embeddings
    """
    cats = await CatService(session).list_cats(current_user.id)
    result = []
    for cat in cats:
        if not cat.face_embedding_path:
            continue
        emb_path = Path(cat.face_embedding_path)
        if not emb_path.exists():
            continue
        embedding = np.load(str(emb_path))
        result.append({
            "cat_id":    str(cat.id),
            "name":      cat.name,
            "embedding": embedding.tolist(),
        })
    return result


@router.get("/{cat_id}", response_model=CatOut)
async def get_cat(cat_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    return await CatService(session).get_cat(cat_id, current_user.id)


@router.patch("/{cat_id}", response_model=CatOut)
async def update_cat(cat_id: uuid.UUID, data: CatUpdate, current_user: CurrentUser, session: DBSession):
    return await CatService(session).update_cat(cat_id, data, current_user.id)


@router.delete("/{cat_id}", status_code=204)
async def delete_cat(cat_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    await CatService(session).delete_cat(cat_id, current_user.id)


# ── NEW: face enrollment ───────────────────────────────────────────────────────

@router.post("/{cat_id}/enroll", status_code=200)
async def enroll_cat_face(
    cat_id: uuid.UUID,
    current_user: CurrentUser,
    session: DBSession,
    photos: List[UploadFile] = File(..., description="1–10 clear photos of the cat"),
):
    """
    Upload 1–10 photos.

    Pipeline (runs in parallel):
      1. Face Model  — extracts 512-d embedding per photo → mean embedding saved to disk
      2. Breed Model — runs ONNX classifier on each photo → averages probabilities
                       → auto-fills Cat.breed if confidence >= 40%

    Called from: /cats page "Enroll Face" button.
    """
    if not (1 <= len(photos) <= 10):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Provide between 1 and 10 photos.")

    # Verify ownership
    cat = await session.scalar(
        select(Cat).where(Cat.id == cat_id, Cat.owner_id == current_user.id)
    )
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cat not found.")

    # Read all image bytes once — used by both models
    images_bytes: list[bytes] = [await p.read() for p in photos]

    loop = asyncio.get_event_loop()

    # ── 1. Face embeddings (existing logic) ───────────────────────────────────
    from app.ai.vision.face_recognition import extract_embedding
    from app.ai.vision.breed_classifier import classify_breed, BreedResult

    embeddings = await asyncio.gather(*[
        loop.run_in_executor(None, extract_embedding, img)
        for img in images_bytes
    ])

    # Mean embedding — more photos = more robust identity
    import numpy as _np
    mean_embedding: _np.ndarray = _np.mean(_np.stack(embeddings), axis=0)
    mean_embedding = mean_embedding / (_np.linalg.norm(mean_embedding) + 1e-9)

    # Save as .npy
    emb_path = EMBEDDINGS_DIR / f"{cat_id}.npy"
    _np.save(str(emb_path), mean_embedding)

    # ── 2. Breed classification (new) ─────────────────────────────────────────
    breed_results: list[BreedResult | None] = await asyncio.gather(*[
        loop.run_in_executor(None, classify_breed, img)
        for img in images_bytes
    ])

    # Average softmax probabilities across all photos that succeeded
    detected_breed: str | None  = None
    breed_confidence: float     = 0.0

    valid_results = [r for r in breed_results if r is not None]
    if valid_results:
        from app.ai.vision.breed_classifier import BREED_LABELS
        import numpy as _np

        # Stack all top-3 as full probability vectors and average
        n_classes = len(BREED_LABELS)
        prob_matrix = _np.zeros((len(valid_results), n_classes), dtype=_np.float32)
        for i, res in enumerate(valid_results):
            for breed_name, prob in res.top3:
                if breed_name in BREED_LABELS:
                    prob_matrix[i, BREED_LABELS.index(breed_name)] = prob

        avg_probs = prob_matrix.mean(axis=0)
        best_idx  = int(_np.argmax(avg_probs))
        breed_confidence = float(avg_probs[best_idx])

        # Only auto-fill breed if we're reasonably confident (>=15% on 60-class model)
        if breed_confidence >= 0.15:
            detected_breed = BREED_LABELS[best_idx]

    # ── 3. Persist to DB ──────────────────────────────────────────────────────
    cat.face_embedding_path = str(emb_path)
    if detected_breed:
        cat.breed = detected_breed
    await session.commit()

    return {
        "status":            "enrolled",
        "cat_id":            str(cat_id),
        "cat_name":          cat.name,
        "photos_used":       len(photos),
        "embedding_dim":     int(mean_embedding.shape[0]),
        "detected_breed":    detected_breed,
        "breed_confidence":  round(breed_confidence, 3),
        "breed_auto_filled": detected_breed is not None,
    }



# Cat detection
@router.get("/{cat_id}/detections")
async def cat_detection_history(
    cat_id: uuid.UUID,
    current_user: CurrentUser,
    session: DBSession,
    limit: int = Query(default=20, le=100),
):
    """
    Recent detections for a single cat. Used on the /cats/[id] profile page.
    Returns the 20 most recent rows from detection_events for this cat.
    """
    from app.database.models.detection_event import DetectionEvent
    from sqlalchemy import select

    # Verify ownership first
    cat = await session.scalar(
        select(Cat).where(Cat.id == cat_id, Cat.owner_id == current_user.id)
    )
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cat not found.")

    rows = await session.execute(
        select(DetectionEvent)
        .where(DetectionEvent.cat_id == cat_id)
        .order_by(DetectionEvent.frame_timestamp.desc())
        .limit(limit)
    )
    events = rows.scalars().all()

    return [
        {
            "id": str(e.id),
            "confidence": e.confidence,
            "track_id": e.track_id,
            "bbox": e.bbox,
            "timestamp": e.frame_timestamp.isoformat(),
        }
        for e in events
    ]

# Image upload for cat profile
@router.post("/{cat_id}/upload-image", status_code=200)
async def upload_cat_image(
    cat_id: uuid.UUID,
    current_user: CurrentUser,
    session: DBSession,
    image: UploadFile = File(...),
):
    """
    Uploads a profile photo for a cat.
    Saves it to disk, updates Cat.profile_image_url.
    """
    cat = await session.scalar(
        select(Cat).where(Cat.id == cat_id, Cat.owner_id == current_user.id)
    )
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cat not found.")

    # Validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="File must be an image.")

    # Save to disk
    suffix   = Path(image.filename).suffix or ".jpg"
    filename = f"{cat_id}{suffix}"
    dest     = PROFILE_IMAGES_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(image.file, f)

    # Update DB
    image_url = f"/static/cat_images/{filename}"
    cat.profile_image_url = image_url
    await session.commit()

    return {"profile_image_url": image_url}