import uuid
import logging
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.camera_stream import CameraStream
from app.database.repositories.camera_stream_repository import CameraStreamRepository
from app.database.schemas.camera_stream import CameraStreamCreate, CameraStreamUpdate

logger = logging.getLogger(__name__)


class CameraStreamService:
    def __init__(self, session: AsyncSession):
        self.repo = CameraStreamRepository(session)

    async def list_streams(self, user_id: uuid.UUID) -> Sequence[CameraStream]:
        return await self.repo.get_by_user(user_id)

    async def get_stream(self, stream_id: uuid.UUID, user_id: uuid.UUID) -> CameraStream:
        stream = await self.repo.get_by_id_and_user(stream_id, user_id)
        if not stream:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera stream not found",
            )
        return stream

    async def create_stream(
        self, data: CameraStreamCreate, user_id: uuid.UUID
    ) -> CameraStream:
        stream = CameraStream(user_id=user_id, **data.model_dump())
        return await self.repo.create(stream)

    async def update_stream(
        self,
        stream_id: uuid.UUID,
        data: CameraStreamUpdate,
        user_id: uuid.UUID,
    ) -> CameraStream:
        stream = await self.get_stream(stream_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(stream, field, value)
        return stream

    async def delete_stream(self, stream_id: uuid.UUID, user_id: uuid.UUID) -> None:
        stream = await self.get_stream(stream_id, user_id)
        deleted = await self.repo.delete(stream.id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete stream",
            )
        logger.info(f"Camera stream {stream_id} deleted by user {user_id}")
