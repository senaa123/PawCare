# app/database/models/activity_session.py — NEW FILE

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin


class ActivitySession(UUIDMixin, TimestampMixin, Base):
    """
    Tracks continuous blocks of the same activity per cat.
    e.g. Whiskers slept from 14:00 to 16:30 = one session.
    """
    __tablename__ = "activity_sessions"

    cat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cats.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    activity: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)