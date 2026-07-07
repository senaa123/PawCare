# app/api/routes/dashboard_ws.py
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.core.security import decode_access_token
from app.websocket.socket_manager import socket_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def dashboard_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    """
    Read-only event stream for the frontend dashboard.
    Connect: ws://host/api/v1/dashboard/ws?token=JWT

    The client sends nothing. The server pushes every event that
    ws_handler broadcasts for this user: CAT_DETECTED, ALERT_CREATED,
    ANOMALY_DETECTED, VOCALIZATION_DETECTED, etc.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Registers with socket_manager — ws_handler will push events here
    await socket_manager.connect(user_id, websocket)
    logger.info("Dashboard WS connected: user=%s", user_id)

    try:
        while True:
            # Keep alive — we don't process anything sent from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        socket_manager.disconnect(user_id, websocket)
        logger.info("Dashboard WS disconnected: user=%s", user_id)