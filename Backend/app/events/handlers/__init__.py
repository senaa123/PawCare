# app/events/handlers/__init__.py — FULL UPDATED FILE

import logging

from app.events.event_bus import event_bus
from app.events.event_types import EventType
from app.events.handlers.alert_handler import handle_anomaly_alert
from app.events.handlers.ws_handler import handle_ws_broadcast
from app.services.activity_session_service import handle_activity_updated

logger = logging.getLogger(__name__)


def register_all_handlers() -> None:
    # Anomaly → create DB alert
    event_bus.subscribe(EventType.ANOMALY_DETECTED, handle_anomaly_alert)
    event_bus.subscribe(EventType.ACTIVITY_UPDATED, handle_activity_updated)

    # These all push to WebSocket dashboard
    event_bus.subscribe(EventType.CAT_DETECTED,          handle_ws_broadcast)
    event_bus.subscribe(EventType.CAT_IDENTIFIED,        handle_ws_broadcast)
    event_bus.subscribe(EventType.VOCALIZATION_DETECTED, handle_ws_broadcast)
    event_bus.subscribe(EventType.ACTIVITY_UPDATED,      handle_ws_broadcast)
    event_bus.subscribe(EventType.ALERT_CREATED,         handle_ws_broadcast)
    event_bus.subscribe(EventType.ANOMALY_DETECTED,      handle_ws_broadcast)

    logger.info("All WebSocket + alert event handlers registered.")
