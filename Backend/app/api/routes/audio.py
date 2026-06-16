# app/api/routes/audio.py — FULL UPDATED FILE

import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.api.dependencies import CurrentUser, DBSession
from app.ai.audio.inference import AudioInferenceService

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_AUDIO_TYPES = (".wav", ".ogg", ".mp3")


@router.post("/analyze")
async def analyze_audio(
    current_user: CurrentUser,   # ← FIXED: auth required
    session: DBSession,
    file: UploadFile = File(...),
):
    """
    Accepts a WAV/OGG/MP3 file, runs YAMNet classification,
    and publishes vocalization events tied to the authenticated user.
    """
    if not any(file.filename.endswith(ext) for ext in ALLOWED_AUDIO_TYPES):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_AUDIO_TYPES)}",
        )

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    service = AudioInferenceService()
    # ← FIXED: user_id now passed so events reach the right dashboard
    result = await service.classify(audio_bytes, user_id=str(current_user.id))
    return result