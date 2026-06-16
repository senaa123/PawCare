import logging
from typing import Any

from app.core.config import settings
from app.ai.audio.preprocessing import load_audio_bytes
from app.ai.audio.classifier import CatAudioClassifier
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType

logger = logging.getLogger(__name__)

_classifier = CatAudioClassifier(settings.YAMNET_MODEL_PATH)


class AudioInferenceService:
    async def classify(self, audio_bytes: bytes, user_id: str | None = None) -> dict[str, Any]:
        audio = load_audio_bytes(audio_bytes)
        results = _classifier.classify(audio)

        if not results:
            return {"classifications": []}

        top = results[0]
        if top.is_cat_vocalization:
            await event_bus.publish(DomainEvent(
                event_type=EventType.VOCALIZATION_DETECTED,
                payload={"label": top.label, "confidence": top.confidence},
                source="audio",
                user_id=user_id,
            ))

        return {
            "classifications": [
                {"label": r.label, "confidence": r.confidence, "is_cat_vocalization": r.is_cat_vocalization}
                for r in results
            ]
        }