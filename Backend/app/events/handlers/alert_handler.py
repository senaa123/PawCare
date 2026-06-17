# app/events/handlers/alert_handler.py

import logging
import uuid

from app.events.event_types import DomainEvent, EventType
from app.database.connection import AsyncSessionLocal
from app.database.models.alert import Alert
from app.database.schemas.alert import AlertCreate
from app.core.constants import AlertSeverity, AlertType
from app.events.event_bus import event_bus

logger = logging.getLogger(__name__)


async def handle_anomaly_alert(event: DomainEvent) -> None:
    """
    Persists an Alert when the AI behavior module fires ANOMALY_DETECTED.
    Opens its own session — no HTTP request context available here.
    """
    if event.event_type != EventType.ANOMALY_DETECTED:
        return
    if not event.user_id:
        logger.warning("ANOMALY_DETECTED has no user_id — skipping")
        return

    cat_id_raw = event.payload.get("cat_id")
    if not cat_id_raw:
        logger.warning("ANOMALY_DETECTED has no cat_id in payload — skipping alert persist")
        return

    try:
        user_uuid = uuid.UUID(event.user_id)
        cat_uuid = uuid.UUID(str(cat_id_raw))
    except ValueError as e:
        logger.error(f"Invalid UUID in anomaly event: {e}")
        return

    # Score severity from the anomaly type in the payload
    anomaly_type = event.payload.get("anomaly_type", "")
    severity = _score_severity(anomaly_type)

    alert_data = AlertCreate(
        cat_id=cat_uuid,
        alert_type=AlertType.UNUSUAL_BEHAVIOR,
        severity=severity,
        title=event.payload.get("title", "Unusual behavior detected"),
        message=event.payload.get("message", str(event.payload)),
    )

    try:
        async with AsyncSessionLocal() as session:
            alert = Alert(user_id=user_uuid, **alert_data.model_dump())
            session.add(alert)
            await session.commit()
            await session.refresh(alert)

        logger.info(f"Anomaly alert persisted: id={alert.id} user={event.user_id}")

        # Push the created alert to the user's dashboard
        await event_bus.publish(DomainEvent(
            event_type=EventType.ALERT_CREATED,
            payload={
                "alert_id": str(alert.id),
                "title": alert_data.title,
                "message": alert_data.message,
                "severity": severity.value,
                "alert_type": AlertType.UNUSUAL_BEHAVIOR.value,
            },
            source="anomaly_detector",
            user_id=event.user_id,
        ))

    except Exception as e:
        logger.error(f"Failed to persist anomaly alert: {e}", exc_info=True)


def _score_severity(anomaly_type: str) -> AlertSeverity:
    high = {"distress", "aggression", "seizure", "injury"}
    medium = {"unusual_sound", "prolonged_inactivity", "rapid_movement"}
    if anomaly_type in high:
        return AlertSeverity.HIGH
    if anomaly_type in medium:
        return AlertSeverity.MEDIUM
    return AlertSeverity.LOW