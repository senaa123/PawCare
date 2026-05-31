import logging
from app.events.event_types import DomainEvent

logger = logging.getLogger(__name__)


async def handle_anomaly_alert(event: DomainEvent) -> None:
    """
    Triggered when an anomaly is detected by the AI behavior module.
    Creates a persisted alert (future: inject DB session via a different pattern).
    """
    logger.warning(
        f"Anomaly event received: source={event.source}, "
        f"payload={event.payload}, user={event.user_id}"
    )
    # Future: inject session and call AlertService.create_alert(...)