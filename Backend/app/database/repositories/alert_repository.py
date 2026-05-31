import uuid
from typing import Sequence

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.alert import Alert
from app.database.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, session: AsyncSession):
        super().__init__(Alert, session)

    async def get_by_user(self, user_id: uuid.UUID, unread_only: bool = False) -> Sequence[Alert]:
        stmt = select(Alert).where(Alert.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Alert.is_read == False)
        result = await self.session.execute(stmt.order_by(Alert.created_at.desc()))
        return result.scalars().all()

    async def mark_as_read(self, alert_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            update(Alert)
            .where(Alert.id == alert_id, Alert.user_id == user_id)
            .values(is_read=True)
        )
        return result.rowcount > 0