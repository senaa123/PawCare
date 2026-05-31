import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin


class AutomationRule(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "automation_rules"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger: Mapped[str] = mapped_column(String(100), nullable=False)
    conditions: Mapped[Optional[dict]] = mapped_column(JSON)  # e.g. {"cat_id": "...", "min_confidence": 0.8}
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    action_config: Mapped[Optional[dict]] = mapped_column(JSON)  # e.g. {"webhook_url": "..."}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)