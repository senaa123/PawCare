# app/database/models/detection_event.py — NEW FILE

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, Float, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin


class DetectionEvent(UUIDMixin, TimestampMixin, Base):
    """
    Every single YOLO detection gets stored here.
    High-volume table — add partitioning by date in production.
    """
    __tablename__ = "detection_events"

    cat_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cats.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    stream_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("camera_streams.id", ondelete="SET NULL"),
        nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    track_id: Mapped[Optional[str]] = mapped_column(String(50))
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    bbox: Mapped[dict] = mapped_column(JSON)            # {x1, y1, x2, y2}
    frame_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )