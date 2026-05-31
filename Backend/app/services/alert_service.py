import uuid
import logging
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.database.models.alert import Alert
from app.database.repositories.alert_repository import AlertRepository
from app.database.schemas.alert import AlertCreate

logger = logging.getLogger(__name__)


class AlertService:
    def __init__(self, session: AsyncSession):
        self.repo = AlertRepository(session)

    async def list_alerts(self, user_id: uuid.UUID, unread_only: bool = False) -> Sequence[Alert]:
        return await self.repo.get_by_user(user_id, unread_only=unread_only)

    async def create_alert(self, data: AlertCreate, user_id: uuid.UUID) -> Alert:
        alert = Alert(user_id=user_id, **data.model_dump())
        return await self.repo.create(alert)

    async def mark_read(self, alert_id: uuid.UUID, user_id: uuid.UUID) -> None:
        updated = await self.repo.mark_as_read(alert_id, user_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")