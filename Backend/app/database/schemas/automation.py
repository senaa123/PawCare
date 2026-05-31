import uuid
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel
from app.core.constants import AutomationTrigger, AutomationAction


class AutomationRuleCreate(BaseModel):
    name: str
    trigger: AutomationTrigger
    conditions: Optional[dict[str, Any]] = None
    action: AutomationAction
    action_config: Optional[dict[str, Any]] = None


class AutomationRuleOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    trigger: str
    conditions: Optional[dict]
    action: str
    action_config: Optional[dict]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}