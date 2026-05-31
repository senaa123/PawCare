import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from app.core.constants import AlertSeverity, AlertType


class AlertCreate(BaseModel):
    cat_id: uuid.UUID
    alert_type: AlertType
    severity: AlertSeverity = AlertSeverity.LOW
    title: str
    message: Optional[str] = None


class AlertOut(BaseModel):
    id: uuid.UUID
    cat_id: uuid.UUID
    alert_type: str
    severity: str
    title: str
    message: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}