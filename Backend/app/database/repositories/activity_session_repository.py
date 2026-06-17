# app/database/repositories/activity_session_repository.py

import uuid
import logging
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import Optional, Sequence

from sqlalchemy import select, update, func, text, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.activity_session import ActivitySession
from app.database.repositories.base import BaseRepository

logger = logging.getLogger(__name__)


class ActivitySessionRepository(BaseRepository[ActivitySession]):

    def __init__(self, session: AsyncSession):
        super().__init__(ActivitySession, session)

    async def get_recent_by_user(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[ActivitySession]:
        result = await self.session.execute(
            select(ActivitySession)
            .where(ActivitySession.user_id == user_id)
            .order_by(ActivitySession.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def get_active_by_user(
        self,
        user_id: uuid.UUID,
    ) -> Sequence[ActivitySession]:
        """Sessions currently open (ended_at IS NULL)."""
        result = await self.session.execute(
            select(ActivitySession)
            .where(
                ActivitySession.user_id == user_id,
                ActivitySession.ended_at.is_(None),
            )
            .order_by(ActivitySession.started_at.desc())
        )
        return result.scalars().all()

    async def get_by_cat(
        self,
        cat_id: uuid.UUID,
        limit: int = 50,
    ) -> Sequence[ActivitySession]:
        result = await self.session.execute(
            select(ActivitySession)
            .where(ActivitySession.cat_id == cat_id)
            .order_by(ActivitySession.started_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_cat_in_range(
        self,
        cat_id: uuid.UUID,
        since: datetime,
        until: Optional[datetime] = None,
    ) -> Sequence[ActivitySession]:
        until = until or datetime.now(timezone.utc)
        result = await self.session.execute(
            select(ActivitySession)
            .where(
                ActivitySession.cat_id == cat_id,
                ActivitySession.started_at >= since,
                ActivitySession.started_at <= until,
            )
            .order_by(ActivitySession.started_at.asc())
        )
        return result.scalars().all()

    async def activity_summary_for_cat(
        self,
        cat_id: uuid.UUID,
        hours: int = 24,
    ) -> dict[str, float]:
        """
        Returns activity → fraction of total observed duration over the last N hours.
        e.g. {"idle": 0.60, "resting": 0.30, "eating": 0.10}
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        sessions = await self.get_by_cat_in_range(cat_id, since)

        totals: Counter[str] = Counter()
        for s in sessions:
            dur = s.duration_seconds or 0
            if dur > 0:
                totals[s.activity] += dur

        grand_total = sum(totals.values())
        if grand_total == 0:
            return {}
        return {activity: round(secs / grand_total, 3) for activity, secs in totals.most_common()}

    async def close_orphaned_sessions(self) -> int:
        """
        Called once at startup. Closes any sessions left open from a previous
        server run by computing their duration from started_at → now in SQL.
        Returns the number of rows updated.
        """
        result = await self.session.execute(
            update(ActivitySession)
            .where(ActivitySession.ended_at.is_(None))
            .values(
                ended_at=func.now(),
                duration_seconds=func.extract(
                    "epoch", func.now() - ActivitySession.started_at
                ).cast(Integer),  # cast handled by Postgres as numeric to Integer
            )
            .returning(ActivitySession.id)
        )
        rows = result.fetchall()
        count = len(rows)
        if count:
            logger.info(f"Startup: closed {count} orphaned activity session(s)")
        return count