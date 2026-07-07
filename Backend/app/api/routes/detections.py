import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.limiter import limiter
from app.api.dependencies import CurrentUser
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType


logger = logging.getLogger(__name__)
router = APIRouter()


class DetectionIngest(BaseModel):
    label: str = "cat"
    confidence: float
    bbox: list[float] | None = None
    track_id: str | None = None
    cat_id: str | None = None
    behavior: str | None = None
    sound: str | None = None
    emotion: str | None = None
    identity_confidence: float | None = None


@router.post("/ingest", status_code=202)
@limiter.limit("60/minute")
async def ingest_detection(request: Request, data: DetectionIngest, current_user: CurrentUser):
    """
    Receive compact events from the edge AI worker.

    The first version only sends cat detections. The same endpoint can now
    carry the later identity, behavior, sound, and emotion fields without
    changing the edge-to-backend contract again.
    """
    user_id = str(current_user.id)
    track_id = data.track_id or str(uuid.uuid4())[:8]

    payload = {
        "track_id": track_id,
        "label": data.label,
        "confidence": data.confidence,
        "bbox": data.bbox,
        "user_id": user_id,
        "cat_id": data.cat_id,
        "behavior": data.behavior,
        "sound": data.sound,
        "emotion": data.emotion,
        "identity_confidence": data.identity_confidence,
    }
    payload = {key: value for key, value in payload.items() if value is not None}

    await event_bus.publish(DomainEvent(
        event_type=EventType.CAT_DETECTED,
        payload=payload,
        source="edge_worker",
        user_id=user_id,
    ))

    if data.cat_id:
        await event_bus.publish(DomainEvent(
            event_type=EventType.CAT_IDENTIFIED,
            payload=payload,
            source="edge_worker",
            user_id=user_id,
        ))

    if data.behavior:
        await event_bus.publish(DomainEvent(
            event_type=EventType.ACTIVITY_UPDATED,
            payload=payload,
            source="edge_worker",
            user_id=user_id,
        ))

    if data.sound:
        await event_bus.publish(DomainEvent(
            event_type=EventType.VOCALIZATION_DETECTED,
            payload=payload,
            source="edge_worker",
            user_id=user_id,
        ))

    if data.bbox is not None:
        asyncio.create_task(_persist(user_id, track_id, data))

    return {"status": "accepted", "track_id": track_id}


async def _persist(user_id: str, track_id: str, data: DetectionIngest):
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.models.detection_event import DetectionEvent

        async with AsyncSessionLocal() as session:
            async with session.begin():
                session.add(DetectionEvent(
                    user_id=uuid.UUID(user_id),
                    cat_id=uuid.UUID(data.cat_id) if data.cat_id else None,
                    track_id=track_id,
                    confidence=data.confidence,
                    bbox={"values": data.bbox},
                    frame_timestamp=datetime.now(timezone.utc),
                ))
    except Exception:
        logger.exception("ingest_detection: failed to persist")
