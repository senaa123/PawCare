import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, List, Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class SocketManager:
    """
    Manages WebSocket connections grouped by user_id.
    Supports multiple concurrent connections per user (multi-device).
    """

    def __init__(self):
        self._connections: DefaultDict[str, List[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: user={user_id} total={len(self._connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        self._connections[user_id].discard(websocket) if hasattr(
            self._connections[user_id], "discard"
        ) else None
        if websocket in self._connections[user_id]:
            self._connections[user_id].remove(websocket)
        logger.info(f"WebSocket disconnected: user={user_id}")

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Send a message to all connections of a specific user."""
        dead = []
        for ws in self._connections.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast(self, message: dict) -> None:
        """Broadcast to all connected users."""
        tasks = [
            self.send_to_user(uid, message)
            for uid in list(self._connections.keys())
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    def connection_count(self) -> int:
        return sum(len(sockets) for sockets in self._connections.values())


# Singleton shared across the app
socket_manager = SocketManager()