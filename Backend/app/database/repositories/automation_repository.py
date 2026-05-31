import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.automation import AutomationRule
from app.database.repositories.base import BaseRepository


class AutomationRuleRepository(BaseRepository[AutomationRule]):
    def __init__(self, session: AsyncSession):
        super().__init__(AutomationRule, session)

    async def get_by_user(self, user_id: uuid.UUID) -> Sequence[AutomationRule]:
        result = await self.session.execute(
            select(AutomationRule)
            .where(AutomationRule.user_id == user_id)
            .order_by(AutomationRule.created_at.desc())
        )
        return result.scalars().all()

    async def get_active_by_trigger(self, trigger: str) -> Sequence[AutomationRule]:
        result = await self.session.execute(
            select(AutomationRule)
            .where(AutomationRule.trigger == trigger, AutomationRule.is_active == True)
        )
        return result.scalars().all()