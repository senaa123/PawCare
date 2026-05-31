import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy import String, ForeignKey, Boolean, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin
from app.core.constants import AlertSeverity, AlertType


class Alert(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "alerts"

    cat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default=AlertSeverity.LOW)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    cat: Mapped["Cat"] = relationship("Cat", back_populates="alerts")