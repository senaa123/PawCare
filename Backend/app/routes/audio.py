import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.ai.audio.inference import AudioInferenceService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Accepts a WAV/OGG audio file and returns audio classification results.
    """
    if not file.filename.endswith((".wav", ".ogg", ".mp3")):
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    audio_bytes = await file.read()

    service = AudioInferenceService()
    result = await service.classify(audio_bytes)
    return result