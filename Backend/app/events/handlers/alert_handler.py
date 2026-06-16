import uuid
import logging

from app.database.connection import AsyncSessionLocal
from app.database.schemas.alert import AlertCreate
from app.core.constants import AlertType, AlertSeverity
from app.events.event_types import DomainEvent, EventType
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)


def _build_alert_from_event(event: DomainEvent) -> AlertCreate | None:
    """
    Map a DomainEvent to an AlertCreate schema.
    Returns None if the event cannot produce a meaningful alert.
    """
    payload = event.payload

    # cat_id is required — skip if missing
    raw_cat_id = payload.get("cat_id")
    if not raw_cat_id:
        logger.warning(
            f"handle_anomaly_alert: no cat_id in payload, skipping. "
            f"event_id={event.event_id}"
        )
        return None

    try:
        cat_id = uuid.UUID(str(raw_cat_id))
    except ValueError:
        logger.warning(f"handle_anomaly_alert: invalid cat_id={raw_cat_id}")
        return None

    anomaly_type = payload.get("anomaly_type", "unknown")
    score        = payload.get("score", 0.0)

    return AlertCreate(
        cat_id=cat_id,
        alert_type=AlertType.UNUSUAL_BEHAVIOR,
        severity=_score_to_severity(score),
        title=f"Anomaly detected: {anomaly_type}",
        message=(
            f"Behavior anomaly '{anomaly_type}' detected with score {score:.2f}. "
            f"Source: {event.source}."
        ),
    )


def _score_to_severity(score: float) -> AlertSeverity:
    if score >= 0.85:
        return AlertSeverity.CRITICAL
    if score >= 0.70:
        return AlertSeverity.HIGH
    if score >= 0.50:
        return AlertSeverity.MEDIUM
    return AlertSeverity.LOW


async def handle_anomaly_alert(event: DomainEvent) -> None:
    """
    Triggered when ANOMALY_DETECTED fires on the event bus.
    Opens its own DB session (handlers run outside the HTTP request cycle),
    persists the alert, then publishes ALERT_CREATED so the WebSocket
    handler can push it to the user's dashboard in real time.
    """
    logger.warning(
        f"Anomaly event received: source={event.source} | "
        f"payload={event.payload} | user={event.user_id}"
    )

    alert_data = _build_alert_from_event(event)
    if alert_data is None:
        return

    if not event.user_id:
        logger.warning("handle_anomaly_alert: event has no user_id, cannot persist.")
        return

    try:
        user_id = uuid.UUID(str(event.user_id))
    except ValueError:
        logger.warning(f"handle_anomaly_alert: invalid user_id={event.user_id}")
        return

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                service = AlertService(session)
                alert   = await service.create_alert(alert_data, user_id)
                logger.info(
                    f"Alert persisted: id={alert.id} | "
                    f"type={alert.alert_type} | severity={alert.severity}"
                )

        # Publish ALERT_CREATED so ws_handler pushes it to the dashboard
        # Import here to avoid circular import at module load
        from app.events.event_bus import event_bus
        from app.events.event_types import DomainEvent as DE

        await event_bus.publish(DE(
            event_type=EventType.ALERT_CREATED,
            payload={
                "alert_id":   str(alert.id),
                "cat_id":     str(alert.cat_id),
                "alert_type": alert.alert_type,
                "severity":   alert.severity,
                "title":      alert.title,
                "message":    alert.message,
            },
            source="alert_handler",
            user_id=str(user_id),
        ))

    except Exception:
        logger.exception("handle_anomaly_alert: failed to persist alert")