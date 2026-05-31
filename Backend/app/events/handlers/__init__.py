"""
Register all event handlers here.
Import this module in main.py after event_bus.start().
"""
import logging
from app.events.event_bus import event_bus
from app.events.event_types import EventType
from app.events.handlers.alert_handler import handle_anomaly_alert
from app.events.handlers.ws_handler import handle_ws_broadcast

logger = logging.getLogger(__name__)


def register_all_handlers():
    event_bus.subscribe(EventType.ANOMALY_DETECTED, handle_anomaly_alert)
    event_bus.subscribe(EventType.CAT_DETECTED, handle_ws_broadcast)
    event_bus.subscribe(EventType.VOCALIZATION_DETECTED, handle_ws_broadcast)
    event_bus.subscribe(EventType.ALERT_CREATED, handle_ws_broadcast)
    logger.info("All event handlers registered.")