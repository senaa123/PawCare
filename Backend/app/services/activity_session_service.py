import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.ai.behavior.anomaly_detection import RoutineAnomalyDetector
from app.database.connection import AsyncSessionLocal
from app.database.models.activity_session import ActivitySession
from app.database.models.cat import Cat
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType


logger = logging.getLogger(__name__)


class ActivitySessionService:
    """
    Persists behavior-model output as per-cat activity sessions.

    The behavior model says "standing" or "lying" right now. This service turns
    those point observations into durable routine history that anomaly detection
    can compare after 2-3 days.
    """

    def __init__(self):
        self.detector = RoutineAnomalyDetector()

    async def handle_activity_updated(self, event: DomainEvent) -> None:
        cat_id_raw = event.payload.get("cat_id")
        activity = event.payload.get("behavior")

        if not event.user_id or not cat_id_raw or not activity:
            return

        try:
            user_id = uuid.UUID(str(event.user_id))
            cat_id = uuid.UUID(str(cat_id_raw))
        except ValueError:
            logger.warning("Invalid activity event UUIDs: user=%s cat=%s", event.user_id, cat_id_raw)
            return

        observed_at = event.timestamp or datetime.now(timezone.utc)
        activity_changed = False

        async with AsyncSessionLocal() as session:
            async with session.begin():
                cat = await session.scalar(
                    select(Cat).where(Cat.id == cat_id, Cat.owner_id == user_id)
                )
                if not cat:
                    logger.warning("Activity event skipped: cat=%s not owned by user=%s", cat_id, user_id)
                    return

                open_session = await session.scalar(
                    select(ActivitySession)
                    .where(ActivitySession.cat_id == cat_id, ActivitySession.ended_at.is_(None))
                    .order_by(ActivitySession.started_at.desc())
                    .limit(1)
                )

                if open_session and open_session.activity == activity:
                    cat.last_activity = activity
                    return

                if open_session:
                    open_session.ended_at = observed_at
                    open_session.duration_seconds = int(
                        max((observed_at - open_session.started_at).total_seconds(), 0)
                    )

                session.add(ActivitySession(
                    cat_id=cat_id,
                    activity=activity,
                    started_at=observed_at,
                ))
                cat.last_activity = activity
                activity_changed = True

            if not activity_changed:
                return

            baseline_start = observed_at - timedelta(days=self.detector.baseline_days)
            today_start = observed_at.replace(hour=0, minute=0, second=0, microsecond=0)

            baseline_result = await session.execute(
                select(ActivitySession).where(
                    ActivitySession.cat_id == cat_id,
                    ActivitySession.started_at >= baseline_start,
                    ActivitySession.started_at < today_start,
                )
            )
            baseline_sessions = list(baseline_result.scalars().all())

        result = self.detector.analyze_activity_change(activity, baseline_sessions, observed_at)
        if not result.is_anomaly:
            return

        await event_bus.publish(DomainEvent(
            event_type=EventType.ANOMALY_DETECTED,
            payload={
                "cat_id": str(cat_id),
                "activity": activity,
                "anomaly_type": result.anomaly_type,
                "score": result.score,
                "title": "Routine change detected",
                "message": result.reason,
            },
            source="routine_anomaly_detector",
            user_id=str(user_id),
        ))


activity_session_service = ActivitySessionService()


async def handle_activity_updated(event: DomainEvent) -> None:
    await activity_session_service.handle_activity_updated(event)
