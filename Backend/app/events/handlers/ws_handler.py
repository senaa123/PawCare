import logging
from app.events.event_types import DomainEvent
from app.websocket.socket_manager import socket_manager

logger = logging.getLogger(__name__)


async def handle_ws_broadcast(event: DomainEvent) -> None:
    """Push AI events to the relevant user's WebSocket connections."""
    message = {
        "event": event.event_type,
        "payload": event.payload,
        "timestamp": event.timestamp.isoformat(),
    }
    if event.user_id:
        await socket_manager.send_to_user(event.user_id, message)
    else:
        await socket_manager.broadcast(message)