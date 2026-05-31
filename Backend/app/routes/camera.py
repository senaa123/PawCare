from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.socket_manager import socket_manager
from app.api.dependencies import CurrentUser

router = APIRouter()


@router.websocket("/ws/{user_id}")
async def camera_stream_ws(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time camera stream and AI event broadcasting.
    Production note: authenticate via token query param before accepting.
    """
    await socket_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Future: forward frame to AI vision pipeline
            await socket_manager.send_to_user(user_id, {"echo": data, "status": "received"})
    except WebSocketDisconnect:
        socket_manager.disconnect(user_id, websocket)


@router.get("/stream/status")
async def stream_status(current_user: CurrentUser):
    return {
        "active_connections": socket_manager.connection_count(),
        "user_id": str(current_user.id),
    }