import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base
from app.database.models.base import UUIDMixin, TimestampMixin
from app.core.constants import CatActivityStatus


class Cat(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "cats"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    breed: Mapped[Optional[str]] = mapped_column(String(100))
    age_months: Mapped[Optional[int]]
    weight_kg: Mapped[Optional[float]] = mapped_column(Float)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500))
    face_embedding_path: Mapped[Optional[str]] = mapped_column(String(500))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    last_activity: Mapped[Optional[str]] = mapped_column(
        String(50), default=CatActivityStatus.UNKNOWN
    )

    owner: Mapped["User"] = relationship("User", back_populates="cats")
    events: Mapped[list["CatEvent"]] = relationship("CatEvent", back_populates="cat", lazy="noload")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="cat", lazy="noload")