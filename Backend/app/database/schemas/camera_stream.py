import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ─── CameraStream ────────────────────────────────────────────────────────────

class CameraStreamCreate(BaseModel):
    name: str
    stream_url: Optional[str] = None
    location: Optional[str] = None


class CameraStreamUpdate(BaseModel):
    name: Optional[str] = None
    stream_url: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class CameraStreamOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    stream_url: Optional[str]
    location: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── DetectionEvent ──────────────────────────────────────────────────────────

class DetectionEventOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    cat_id: Optional[uuid.UUID]
    stream_id: Optional[uuid.UUID]
    track_id: Optional[str]
    confidence: float
    bbox: dict
    frame_timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── ActivitySession ─────────────────────────────────────────────────────────

class ActivitySessionOut(BaseModel):
    id: uuid.UUID
    cat_id: uuid.UUID
    activity: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
