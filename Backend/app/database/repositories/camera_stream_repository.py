import uuid
from typing import Sequence, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.camera_stream import CameraStream
from app.database.repositories.base import BaseRepository


class CameraStreamRepository(BaseRepository[CameraStream]):
    def __init__(self, session: AsyncSession):
        super().__init__(CameraStream, session)

    async def get_by_user(self, user_id: uuid.UUID) -> Sequence[CameraStream]:
        result = await self.session.execute(
            select(CameraStream)
            .where(CameraStream.user_id == user_id)
            .order_by(CameraStream.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id_and_user(
        self, stream_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[CameraStream]:
        result = await self.session.execute(
            select(CameraStream).where(
                CameraStream.id == stream_id,
                CameraStream.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def set_active(self, stream_id: uuid.UUID, is_active: bool) -> bool:
        result = await self.session.execute(
            update(CameraStream)
            .where(CameraStream.id == stream_id)
            .values(is_active=is_active)
        )
        return result.rowcount > 0
