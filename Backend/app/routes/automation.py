import uuid
from typing import List

from fastapi import APIRouter

from app.api.dependencies import DBSession, CurrentUser
from app.database.schemas.automation import AutomationRuleCreate, AutomationRuleOut
from app.services.automation_service import AutomationService

router = APIRouter()


@router.get("/", response_model=List[AutomationRuleOut])
async def list_rules(current_user: CurrentUser, session: DBSession):
    return await AutomationService(session).list_rules(current_user.id)


@router.post("/", response_model=AutomationRuleOut, status_code=201)
async def create_rule(data: AutomationRuleCreate, current_user: CurrentUser, session: DBSession):
    return await AutomationService(session).create_rule(data, current_user.id)


@router.patch("/{rule_id}/toggle", response_model=AutomationRuleOut)
async def toggle_rule(rule_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    return await AutomationService(session).toggle_rule(rule_id, current_user.id)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, current_user: CurrentUser, session: DBSession):
    await AutomationService(session).delete_rule(rule_id, current_user.id)