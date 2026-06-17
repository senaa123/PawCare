# app/api/routes/activity.py

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.database.models.user import User
from app.database.models.cat import Cat
from app.database.repositories.activity_session_repository import ActivitySessionRepository
from app.database.schemas.activity_session import ActivitySessionOut, ActivitySummaryOut
from app.ai.behavior.session_tracker import session_tracker

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/sessions", response_model=list[ActivitySessionOut])
async def list_sessions(
    limit:  int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db:     AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recent activity sessions for the current user, newest first."""
    repo = ActivitySessionRepository(db)
    sessions = await repo.get_recent_by_user(current_user.id, limit=limit, offset=offset)
    return sessions


@router.get("/sessions/active", response_model=list[ActivitySessionOut])
async def list_active_sessions(
    db:   AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sessions currently open — cats that are being detected right now."""
    repo = ActivitySessionRepository(db)
    return await repo.get_active_by_user(current_user.id)


@router.get("/sessions/active/count")
async def active_session_count(
    current_user: User = Depends(get_current_user),
):
    """
    In-memory count of actively tracked cats.
    Slightly faster than a DB query — good for dashboard polling.
    """
    return {"count": session_tracker.active_count()}


@router.get("/cats/{cat_id}/sessions", response_model=list[ActivitySessionOut])
async def cat_sessions(
    cat_id: uuid.UUID,
    limit:  int = Query(50, ge=1, le=200),
    db:     AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All recorded sessions for a specific cat (ownership enforced)."""
    cat = await db.get(Cat, cat_id)
    if not cat or cat.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cat not found")

    repo = ActivitySessionRepository(db)
    return await repo.get_by_cat(cat_id, limit=limit)


@router.get("/cats/{cat_id}/summary", response_model=ActivitySummaryOut)
async def cat_activity_summary(
    cat_id: uuid.UUID,
    hours:  int = Query(24, ge=1, le=168),
    db:     AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Activity breakdown for a cat over the last N hours.
    Returns fraction of total detected duration per activity type.
    """
    cat = await db.get(Cat, cat_id)
    if not cat or cat.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cat not found")

    repo = ActivitySessionRepository(db)
    breakdown = await repo.activity_summary_for_cat(cat_id, hours=hours)

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    sessions = await repo.get_by_cat_in_range(cat_id, since)

    return ActivitySummaryOut(
        cat_id=cat_id,
        hours=hours,
        breakdown=breakdown,
        total_sessions=len(sessions),
    )