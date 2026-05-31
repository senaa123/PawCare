import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin


class CatEvent(UUIDMixin, TimestampMixin, Base):
    """Records AI-detected events: detections, behaviors, audio triggers."""
    __tablename__ = "cat_events"

    cat_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cats.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(50))  # "camera", "audio", "manual"
    payload: Mapped[Optional[dict]] = mapped_column(JSON)  # arbitrary AI result metadata

    cat: Mapped[Optional["Cat"]] = relationship("Cat", back_populates="events")