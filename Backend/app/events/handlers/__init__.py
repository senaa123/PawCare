# app/events/handlers/__init__.py

import logging

from app.events.event_bus import event_bus
from app.events.event_types import EventType
from app.events.handlers.alert_handler import handle_anomaly_alert
from app.events.handlers.ws_handler import handle_ws_broadcast
from app.events.handlers.activity_handler import handle_activity_tracking

logger = logging.getLogger(__name__)


def register_all_handlers() -> None:
    # Anomaly → persist Alert in DB
    event_bus.subscribe(EventType.ANOMALY_DETECTED, handle_anomaly_alert)

    # CAT_DETECTED → open/close activity sessions
    event_bus.subscribe(EventType.CAT_DETECTED, handle_activity_tracking)

    # WebSocket broadcast — dashboard receives all of these in real time
    event_bus.subscribe(EventType.CAT_DETECTED,          handle_ws_broadcast)
    event_bus.subscribe(EventType.CAT_IDENTIFIED,        handle_ws_broadcast)
    event_bus.subscribe(EventType.VOCALIZATION_DETECTED, handle_ws_broadcast)
    event_bus.subscribe(EventType.ALERT_CREATED,         handle_ws_broadcast)
    event_bus.subscribe(EventType.ANOMALY_DETECTED,      handle_ws_broadcast)
    event_bus.subscribe(EventType.ACTIVITY_UPDATED,      handle_ws_broadcast)  # ← NEW

    logger.info("All event handlers registered.")