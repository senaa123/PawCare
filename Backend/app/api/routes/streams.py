import uuid
from typing import List

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DBSession
from app.database.schemas.camera_stream import (
    CameraStreamCreate,
    CameraStreamUpdate,
    CameraStreamOut,
)
from app.services.camera_stream_service import CameraStreamService

router = APIRouter()


@router.get("/", response_model=List[CameraStreamOut])
async def list_streams(current_user: CurrentUser, db: DBSession):
    """List all camera streams owned by the authenticated user."""
    service = CameraStreamService(db)
    return await service.list_streams(current_user.id)


@router.post("/", response_model=CameraStreamOut, status_code=status.HTTP_201_CREATED)
async def create_stream(
    data: CameraStreamCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Register a new camera stream for the authenticated user."""
    service = CameraStreamService(db)
    return await service.create_stream(data, current_user.id)


@router.get("/{stream_id}", response_model=CameraStreamOut)
async def get_stream(stream_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    """Get a single camera stream by ID (ownership enforced)."""
    service = CameraStreamService(db)
    return await service.get_stream(stream_id, current_user.id)


@router.patch("/{stream_id}", response_model=CameraStreamOut)
async def update_stream(
    stream_id: uuid.UUID,
    data: CameraStreamUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update name, URL, location, or active state of a stream."""
    service = CameraStreamService(db)
    return await service.update_stream(stream_id, data, current_user.id)


@router.delete("/{stream_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stream(
    stream_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    """Delete a camera stream (ownership enforced)."""
    service = CameraStreamService(db)
    await service.delete_stream(stream_id, current_user.id)
