"""Add track_id, user_id to activity_sessions; make cat_id nullable

Revision ID: b4f7c2a1d3e9
Revises: 1ef1a361d140
Create Date: 2026-06-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b4f7c2a1d3e9"
down_revision: Union[str, None] = "1ef1a361d140"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make cat_id nullable — sessions exist before face recognition
    op.alter_column("activity_sessions", "cat_id", nullable=True)

    # 2. Add track_id — IoU tracker linkage
    op.add_column(
        "activity_sessions",
        sa.Column("track_id", sa.String(length=50), nullable=True),
    )
    op.create_index(
        op.f("ix_activity_sessions_track_id"),
        "activity_sessions", ["track_id"], unique=False,
    )

    # 3. Add user_id — direct user-scoped queries
    op.add_column(
        "activity_sessions",
        sa.Column("user_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_activity_sessions_user_id",
        "activity_sessions", "users",
        ["user_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_activity_sessions_user_id"),
        "activity_sessions", ["user_id"], unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_sessions_user_id"), table_name="activity_sessions")
    op.drop_constraint("fk_activity_sessions_user_id", "activity_sessions", type_="foreignkey")
    op.drop_column("activity_sessions", "user_id")

    op.drop_index(op.f("ix_activity_sessions_track_id"), table_name="activity_sessions")
    op.drop_column("activity_sessions", "track_id")

    op.alter_column("activity_sessions", "cat_id", nullable=False)