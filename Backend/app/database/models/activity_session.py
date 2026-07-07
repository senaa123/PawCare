# app/database/models/activity_session.py

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
    Tracks continuous blocks of the same activity per cat/track.

    cat_id is nullable: sessions exist before face recognition links
    a tracker ID to a known registered cat. Once face recognition
    runs, cat_id is backfilled on the open session.
    """
    __tablename__ = "activity_sessions"

    # Nullable until face recognition identifies the track
    cat_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cats.id", ondelete="CASCADE"),
        nullable=True, index=True
    )
    # Who owns this session (allows user-scoped queries without joining cats)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True, index=True
    )
    # The IoU tracker's short ID for this cat across frames
    track_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True
    )
    activity: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)