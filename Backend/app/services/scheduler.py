# Backend/app/services/scheduler.py
"""
APScheduler setup for PawCare.
Runs background jobs that can't be triggered by HTTP requests.

Current jobs:
  - anomaly_check  : runs every 6 hours
                     queries activity_sessions per cat,
                     runs RoutineAnomalyDetector,
                     publishes ANOMALY_DETECTED if something is off

Wire into main.py startup/shutdown (see bottom of this file).
"""

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.database.connection import AsyncSessionLocal
from app.database.models.cat import Cat
from app.database.models.activity_session import ActivitySession
from app.ai.behavior.anomaly_detection import RoutineAnomalyDetector
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
detector  = RoutineAnomalyDetector(baseline_days=3, min_baseline_days=2)


# ── job ────────────────────────────────────────────────────────────────────────

async def anomaly_check_job() -> None:
    """
    Runs every 6 hours.
    For every cat that has at least 2 days of activity sessions:
      1. Pull baseline sessions (last 3 days)
      2. Pull today's sessions
      3. Check if expected eating activity is missing
      4. If anomaly found → publish ANOMALY_DETECTED
         → alert_handler picks it up → creates Alert → pushes to dashboard WS
    """
    logger.info("anomaly_check_job: starting")
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        # Get all cats that have activity data
        cats_result = await session.execute(
            select(Cat).join(
                ActivitySession, ActivitySession.cat_id == Cat.id
            ).distinct()
        )
        cats = cats_result.scalars().all()

    logger.info("anomaly_check_job: checking %d cats", len(cats))

    for cat in cats:
        try:
            await _check_cat(cat, now)
        except Exception:
            logger.exception("anomaly_check_job: error checking cat %s", cat.id)

    logger.info("anomaly_check_job: done")


async def _check_cat(cat: Cat, now: datetime) -> None:
    baseline_since = now - timedelta(days=3)
    today_since    = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async with AsyncSessionLocal() as session:
        # 3-day baseline
        baseline_rows = await session.execute(
            select(ActivitySession).where(
                ActivitySession.cat_id == cat.id,
                ActivitySession.started_at >= baseline_since,
                ActivitySession.started_at < today_since,
            )
        )
        baseline = baseline_rows.scalars().all()

        # Today so far
        today_rows = await session.execute(
            select(ActivitySession).where(
                ActivitySession.cat_id == cat.id,
                ActivitySession.started_at >= today_since,
            )
        )
        today = today_rows.scalars().all()

    if not baseline:
        logger.debug("anomaly_check: cat %s — not enough baseline data yet", cat.name)
        return

    # Check if eating is missing compared to usual routine
    result = detector.analyze_missing_expected_activity(
        expected_activity="eating",
        baseline_sessions=baseline,
        today_sessions=today,
        observed_at=now,
        minimum_expected_minutes=5,
    )

    if result.is_anomaly:
        logger.info(
            "anomaly_check: ANOMALY for cat %s — %s (score %.2f)",
            cat.name, result.reason, result.score,
        )
        await event_bus.publish(DomainEvent(
            event_type=EventType.ANOMALY_DETECTED,
            payload={
                "cat_id":       str(cat.id),
                "cat_name":     cat.name,
                "anomaly_type": result.anomaly_type,
                "reason":       result.reason,
                "score":        result.score,
                "description":  f"{cat.name}: {result.reason}",
            },
            source="scheduler",
            user_id=str(cat.owner_id),
        ))


# ── start / stop (called from main.py lifespan) ────────────────────────────────

def start_scheduler() -> None:
    scheduler.add_job(
        anomaly_check_job,
        trigger=IntervalTrigger(hours=6),
        id="anomaly_check",
        name="Routine anomaly check",
        replace_existing=True,
        next_run_time=datetime.now(),  # run once immediately on startup too
    )
    scheduler.start()
    logger.info("Scheduler started — anomaly_check runs every 6 hours")


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")