# app/database/schemas/activity_session.py

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field


class ActivitySessionOut(BaseModel):
    id:               uuid.UUID
    cat_id:           Optional[uuid.UUID]
    user_id:          Optional[uuid.UUID]
    track_id:         Optional[str]
    activity:         str
    started_at:       datetime
    ended_at:         Optional[datetime]
    duration_seconds: Optional[int]
    created_at:       datetime

    @computed_field
    @property
    def is_active(self) -> bool:
        return self.ended_at is None

    model_config = {"from_attributes": True}


class ActivitySummaryOut(BaseModel):
    cat_id:       uuid.UUID
    hours:        int
    breakdown:    dict[str, float]   # activity → fraction (0.0–1.0)
    total_sessions: int