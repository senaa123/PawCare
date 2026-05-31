import uuid
import logging
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.database.models.automation import AutomationRule
from app.database.repositories.automation_repository import AutomationRuleRepository
from app.database.schemas.automation import AutomationRuleCreate

logger = logging.getLogger(__name__)


class AutomationService:
    def __init__(self, session: AsyncSession):
        self.repo = AutomationRuleRepository(session)

    async def list_rules(self, user_id: uuid.UUID) -> Sequence[AutomationRule]:
        return await self.repo.get_by_user(user_id)

    async def create_rule(self, data: AutomationRuleCreate, user_id: uuid.UUID) -> AutomationRule:
        rule = AutomationRule(user_id=user_id, **data.model_dump())
        return await self.repo.create(rule)

    async def toggle_rule(self, rule_id: uuid.UUID, user_id: uuid.UUID) -> AutomationRule:
        rule = await self.repo.get_by_id(rule_id)
        if not rule or rule.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        rule.is_active = not rule.is_active
        return rule

    async def delete_rule(self, rule_id: uuid.UUID, user_id: uuid.UUID) -> None:
        rule = await self.repo.get_by_id(rule_id)
        if not rule or rule.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        await self.repo.delete(rule_id)