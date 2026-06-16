# app/ai/vision/inference.py — FULL UPDATED FILE

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np

from app.ai.vision.detector import CatDetector
from app.ai.vision.tracker import CatTracker
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType

logger = logging.getLogger(__name__)

# Module-level singletons — instantiated once, reused across requests
_detector = CatDetector()
_tracker  = CatTracker()


async def _persist_detection(
    user_id: str,
    track_id: Optional[str],
    confidence: float,
    bbox: list,
    cat_id: Optional[str] = None,
    stream_id: Optional[str] = None,
) -> None:
    """
    Persist a single detection row to detection_events table.
    Opens its own session — AI modules must never import from routes/services
    directly, so we use AsyncSessionLocal here.
    Errors are caught and logged; a DB failure must never crash the AI pipeline.
    """
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.models.detection_event import DetectionEvent

        async with AsyncSessionLocal() as session:
            async with session.begin():
                record = DetectionEvent(
                    user_id=uuid.UUID(user_id),
                    cat_id=uuid.UUID(cat_id) if cat_id else None,
                    stream_id=uuid.UUID(stream_id) if stream_id else None,
                    track_id=str(track_id) if track_id is not None else None,
                    confidence=confidence,
                    bbox={"values": bbox},          # stored as JSON
                    frame_timestamp=datetime.now(timezone.utc),
                )
                session.add(record)
    except Exception:
        logger.exception("_persist_detection: failed to write detection event")


async def process_frame(frame: np.ndarray, user_id: str) -> list[dict[str, Any]]:
    """
    Full vision pipeline: decode → detect → track → publish events → persist.

    YOLO runs in a thread pool to avoid blocking the async event loop.
    DB persistence runs as a fire-and-forget task so it doesn't add
    latency to the WebSocket response.
    """
    loop = asyncio.get_event_loop()

    # ── 1. Run CPU-heavy detection in a thread pool ───────────────────────
    detections = await loop.run_in_executor(None, _detector.detect, frame)

    if not detections:
        return []

    # ── 2. Update IoU tracker (lightweight, safe on event loop) ──────────
    tracked = _tracker.update(detections)

    results = []
    persist_tasks = []

    for item in tracked:
        det = item["detection"]
        payload = {
            "track_id":   item["track_id"],
            "label":      det.label,
            "confidence": det.confidence,
            "bbox":       list(det.bbox),
            "user_id":    user_id,
        }
        results.append(payload)

        # ── 3. Publish to event bus (automation + WebSocket handlers) ─────
        await event_bus.publish(DomainEvent(
            event_type=EventType.CAT_DETECTED,
            payload=payload,
            source="camera",
            user_id=user_id,
        ))

        # ── 4. Schedule DB persistence as a background task ───────────────
        #    Fire-and-forget: does not block the frame processing loop
        task = asyncio.create_task(
            _persist_detection(
                user_id=user_id,
                track_id=item["track_id"],
                confidence=det.confidence,
                bbox=list(det.bbox),
            )
        )
        persist_tasks.append(task)

    logger.debug(
        f"Frame processed: {len(results)} detection(s) | "
        f"user={user_id} | persisting={len(persist_tasks)} records"
    )
    return results