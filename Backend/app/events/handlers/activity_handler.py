# app/events/handlers/activity_handler.py

import logging
from app.events.event_types import DomainEvent, EventType
from app.ai.behavior.session_tracker import session_tracker

logger = logging.getLogger(__name__)

# Maps raw detector labels to stored activity strings.
# "cat" is what YOLOv8n gives — no behavior info yet, stored as "idle".
# Roboflow behavior labels are added here as that integration lands.
_LABEL_MAP: dict[str, str] = {
    "cat":      "idle",
    "sitting":  "idle",
    "standing": "active",
    "lying":    "resting",
    "sleeping": "resting",
    "eating":   "eating",
    "playing":  "playing",
    "grooming": "grooming",
}


async def handle_activity_tracking(event: DomainEvent) -> None:
    """
    CAT_DETECTED → session_tracker.process_detection()

    Normalizes the YOLO/Roboflow label to a stored activity string,
    then hands off to the state machine.
    """
    if event.event_type != EventType.CAT_DETECTED:
        return
    if not event.user_id:
        return

    track_id = event.payload.get("track_id")
    if not track_id:
        logger.debug("CAT_DETECTED has no track_id — skipping activity tracking")
        return

    raw_label = event.payload.get("label", "cat")
    activity = _LABEL_MAP.get(raw_label, raw_label)  # fall through unknown labels as-is
    cat_id = event.payload.get("cat_id")              # None until face recognition

    await session_tracker.process_detection(
        track_id=str(track_id),
        activity=activity,
        user_id=event.user_id,
        cat_id=cat_id,
    )