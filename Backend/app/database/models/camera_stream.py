# app/database/models/camera_stream.py — NEW FILE

import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin


class CameraStream(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "camera_streams"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    stream_url: Mapped[Optional[str]] = mapped_column(String(500))
    location: Mapped[Optional[str]] = mapped_column(String(100))  # e.g. "living room"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)