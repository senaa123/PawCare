# Backend/app/api/routes/analytics.py
"""
Analytics endpoints — read-only aggregates from detection_events
and activity_sessions for the dashboard charts.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, select, cast, Date

from app.api.dependencies import DBSession, CurrentUser
from app.database.models.detection_event import DetectionEvent
from app.database.models.activity_session import ActivitySession
from app.database.models.cat import Cat

router = APIRouter()


@router.get("/detections/daily")
async def daily_detections(
    current_user: CurrentUser,
    session: DBSession,
    days: int = Query(default=7, ge=1, le=30),
):
    """
    Detection count per day for the last N days.
    Returns: [{"date": "2024-06-01", "count": 14}, ...]
    Used for: LineChart on analytics page.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = await session.execute(
        select(
            cast(DetectionEvent.frame_timestamp, Date).label("date"),
            func.count(DetectionEvent.id).label("count"),
        )
        .where(
            DetectionEvent.user_id == current_user.id,
            DetectionEvent.frame_timestamp >= since,
        )
        .group_by(cast(DetectionEvent.frame_timestamp, Date))
        .order_by(cast(DetectionEvent.frame_timestamp, Date))
    )
    data = [{"date": str(r.date), "count": r.count} for r in rows]

    # Fill in missing days with 0 so the chart has no gaps
    result, date_set = [], {d["date"] for d in data}
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        count = next((d["count"] for d in data if d["date"] == day), 0)
        result.append({"date": day, "count": count})

    return result


@router.get("/behaviors")
async def behavior_distribution(
    current_user: CurrentUser,
    session: DBSession,
    cat_id: Optional[str] = Query(default=None),
):
    """
    Total time (seconds) per activity across all cats (or one cat).
    Returns: [{"activity": "sitting", "seconds": 3600}, ...]
    Used for: PieChart / BarChart on analytics page.
    """
    stmt = (
        select(
            ActivitySession.activity,
            func.coalesce(
                func.sum(ActivitySession.duration_seconds), 0
            ).label("seconds"),
        )
        .join(Cat, Cat.id == ActivitySession.cat_id)
        .where(Cat.owner_id == current_user.id)
    )
    if cat_id:
        stmt = stmt.where(ActivitySession.cat_id == cat_id)

    stmt = stmt.group_by(ActivitySession.activity).order_by(func.sum(ActivitySession.duration_seconds).desc())
    rows = await session.execute(stmt)
    return [{"activity": r.activity, "seconds": int(r.seconds)} for r in rows]


@router.get("/cats/activity")
async def per_cat_detections(
    current_user: CurrentUser,
    session: DBSession,
):
    """
    Total detections per cat (for known cats only).
    Returns: [{"name": "Milo", "detections": 42}, ...]
    Used for: BarChart on analytics page.
    """
    rows = await session.execute(
        select(
            Cat.name,
            func.count(DetectionEvent.id).label("detections"),
        )
        .join(DetectionEvent, DetectionEvent.cat_id == Cat.id, isouter=True)
        .where(Cat.owner_id == current_user.id)
        .group_by(Cat.id, Cat.name)
        .order_by(func.count(DetectionEvent.id).desc())
    )
    return [{"name": r.name, "detections": r.detections} for r in rows]