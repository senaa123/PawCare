# app/api/routes/camera.py — FULL UPDATED FILE

import base64
import logging
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.websocket.socket_manager import socket_manager
from app.ai.vision.inference import process_frame
from app.api.dependencies import CurrentUser
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter()


async def _authenticate_ws(websocket: WebSocket, token: Optional[str]) -> Optional[str]:
    """
    Validate the JWT token supplied as a query param on WebSocket connect.
    Returns the user_id string on success, or closes the connection and
    returns None on failure.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("Camera WebSocket rejected: no token provided")
        return None

    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("Camera WebSocket rejected: invalid or expired token")
        return None

    return user_id


@router.websocket("/ws")
async def camera_stream_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    """
    Authenticated camera streaming endpoint.

    Connect with:  ws://<host>/api/v1/camera/ws?token=<JWT>

    Expected client message format:
    { "frame": "<base64-encoded JPEG/PNG bytes>" }

    The server responds with detection results after each frame.
    """
    # ── Step 1: authenticate before accepting the connection ──────────────
    user_id = await _authenticate_ws(websocket, token)
    if user_id is None:
        return  # connection already closed inside _authenticate_ws

    await socket_manager.connect(user_id, websocket)
    logger.info(f"Camera WebSocket opened for user: {user_id}")

    try:
        while True:
            data = await websocket.receive_json()

            if "frame" not in data:
                await websocket.send_json({"error": "Missing 'frame' field"})
                continue

            # ── Step 2: decode base64 → numpy array ───────────────────────
            try:
                img_bytes = base64.b64decode(data["frame"])
                np_arr    = np.frombuffer(img_bytes, np.uint8)
                frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"Frame decode failed: {e}")
                await websocket.send_json({"error": "Invalid frame data"})
                continue

            if frame is None:
                await websocket.send_json({"error": "Could not decode image"})
                continue

            # ── Step 3: run AI pipeline ───────────────────────────────────
            results = await process_frame(frame, user_id)

            # ── Step 4: push results back to this specific client ─────────
            await socket_manager.send_to_user(user_id, {
                "type":            "detection_result",
                "detections":      results,
                "frame_processed": True,
            })

    except WebSocketDisconnect:
        socket_manager.disconnect(user_id, websocket)
        logger.info(f"Camera WebSocket closed for user: {user_id}")


@router.get("/stream/status")
async def stream_status(current_user: CurrentUser):
    """Returns the number of active WebSocket connections for this user."""
    return {
        "active_connections": socket_manager.connection_count(),
        "user_id":            str(current_user.id),
    }