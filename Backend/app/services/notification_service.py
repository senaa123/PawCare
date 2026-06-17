# app/services/notification_service.py

import logging
import uuid

from sqlalchemy import select

from app.database.connection import AsyncSessionLocal
from app.database.models.alert import Alert
from app.database.models.cat import Cat
from app.core.constants import AlertSeverity, AlertType
from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Handles SEND_NOTIFICATION automation actions.
    Opens its own DB session — called from the rules engine,
    outside any HTTP request context.
    """

    async def send(
        self,
        user_id: str,
        title: str,
        message: str,
        severity: str = "medium",
        alert_type: str = AlertType.UNUSUAL_BEHAVIOR.value,
        cat_id: str | None = None,
        event: DomainEvent | None = None,
    ) -> None:
        """
        1. Resolve & validate cat_id  (prevents FK violation)
        2. Persist an Alert to the DB
        3. Publish ALERT_CREATED so ws_handler pushes it to the dashboard
        """
        # ── Resolve user UUID ─────────────────────────────────────────────
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except ValueError:
            logger.error(f"SEND_NOTIFICATION skipped — invalid user_id={user_id}")
            return

        # ── Resolve cat_id: prefer explicit config, fall back to event payload ──
        raw_cat_id = cat_id or (event.payload.get("cat_id") if event else None)
        if not raw_cat_id:
            logger.warning(
                f"SEND_NOTIFICATION skipped — no cat_id for user={user_id}. "
                f"Add cat_id to action_config or event payload."
            )
            return

        try:
            cat_uuid = uuid.UUID(str(raw_cat_id))
        except ValueError:
            logger.error(f"SEND_NOTIFICATION skipped — invalid cat_id={raw_cat_id}")
            return

        # ── Map severity string → enum ────────────────────────────────────
        severity_map = {
            "low":      AlertSeverity.LOW,
            "medium":   AlertSeverity.MEDIUM,
            "high":     AlertSeverity.HIGH,
            "critical": AlertSeverity.CRITICAL,
        }
        severity_enum = severity_map.get(severity.lower(), AlertSeverity.MEDIUM)

        # ── Map alert_type string → enum ──────────────────────────────────
        type_map = {t.value: t for t in AlertType}
        alert_type_enum = type_map.get(alert_type, AlertType.UNUSUAL_BEHAVIOR)

        try:
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    # ── Validate cat exists and belongs to this user ───────
                    cat_result = await session.execute(
                        select(Cat).where(
                            Cat.id == cat_uuid,
                            Cat.owner_id == user_uuid,
                        )
                    )
                    if not cat_result.scalar_one_or_none():
                        logger.warning(
                            f"SEND_NOTIFICATION skipped — cat {cat_uuid} "
                            f"not found or not owned by user {user_id}"
                        )
                        return

                    # ── Persist Alert ─────────────────────────────────────
                    alert = Alert(
                        user_id=user_uuid,
                        cat_id=cat_uuid,
                        alert_type=alert_type_enum.value,
                        severity=severity_enum.value,
                        title=title,
                        message=message,
                    )
                    session.add(alert)
                    await session.flush()
                    await session.refresh(alert)

            logger.info(
                f"Notification persisted: alert_id={alert.id} "
                f"user={user_id} title='{title}'"
            )

            # ── Push to user's WebSocket dashboard immediately ────────────
            await event_bus.publish(DomainEvent(
                event_type=EventType.ALERT_CREATED,
                payload={
                    "alert_id":   str(alert.id),
                    "title":      title,
                    "message":    message,
                    "severity":   severity_enum.value,
                    "alert_type": alert_type_enum.value,
                },
                source="automation",
                user_id=user_id,
            ))

        except Exception:
            logger.exception(
                f"SEND_NOTIFICATION: failed to persist alert for user={user_id}"
            )