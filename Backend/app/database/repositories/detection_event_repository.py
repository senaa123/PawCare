import uuid
from datetime import datetime
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.detection_event import DetectionEvent
from app.database.repositories.base import BaseRepository


class DetectionEventRepository(BaseRepository[DetectionEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(DetectionEvent, session)

    async def get_by_user(
        self,
        user_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[DetectionEvent]:
        result = await self.session.execute(
            select(DetectionEvent)
            .where(DetectionEvent.user_id == user_id)
            .order_by(DetectionEvent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def get_by_cat(
        self,
        cat_id: uuid.UUID,
        limit: int = 100,
    ) -> Sequence[DetectionEvent]:
        result = await self.session.execute(
            select(DetectionEvent)
            .where(DetectionEvent.cat_id == cat_id)
            .order_by(DetectionEvent.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
