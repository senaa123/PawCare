import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CatCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    age_months: Optional[int] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None


class CatUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    age_months: Optional[int] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None


class CatOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    breed: Optional[str]
    age_months: Optional[int]
    weight_kg: Optional[float]
    photo_url: Optional[str]
    notes: Optional[str]
    last_activity: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}