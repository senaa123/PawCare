# app/automation/rules_engine.py

import logging
from typing import Any

from app.core.constants import AutomationAction
from app.events.event_types import DomainEvent

logger = logging.getLogger(__name__)


class RulesEngine:
    """
    Evaluates automation rules against incoming domain events.
    Rules loaded from DB by AutomationService at startup or on-demand.
    """

    async def evaluate(self, event: DomainEvent, rules: list[Any]) -> None:
        for rule in rules:
            # rule.trigger is a plain string from DB (e.g. "cat.detected")
            # event.event_type is an EventType enum whose .value is that same string
            if rule.trigger != event.event_type.value:
                continue
            if not self._conditions_match(rule.conditions or {}, event.payload):
                continue
            logger.info(f"Rule '{rule.name}' matched — executing action: {rule.action}")
            await self._execute_action(rule.action, rule.action_config or {}, event)

    def _conditions_match(self, conditions: dict, payload: dict) -> bool:
        for key, expected in conditions.items():
            actual = payload.get(key)
            # Support numeric comparisons for thresholds (e.g. min_confidence)
            if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
                if actual < expected:
                    return False
            elif actual != expected:
                return False
        return True

    async def _execute_action(
        self, action: str, config: dict, event: DomainEvent
    ) -> None:
        # action is a plain string from DB — compare against enum .value
        match action:
            case AutomationAction.SEND_NOTIFICATION.value:
                await self._send_notification(config, event)
            case AutomationAction.TRIGGER_FEEDER.value:
                logger.info(f"ACTION: trigger_feeder config={config} [not yet wired]")
            case AutomationAction.SEND_WEBHOOK.value:
                await self._send_webhook(config.get("url"), event)
            case AutomationAction.RECORD_VIDEO.value:
                logger.info(f"ACTION: record_video config={config} [not yet wired]")
            case AutomationAction.PLAY_SOUND.value:
                logger.info(f"ACTION: play_sound config={config} [not yet wired]")
            case _:
                logger.warning(f"Unknown action: {action}")

    async def _send_notification(self, config: dict, event: DomainEvent) -> None:
        """
        config keys (set when creating the automation rule):
          title       — notification title (required)
          message     — notification body (optional, defaults to event summary)
          severity    — low | medium | high | critical (default: medium)
          alert_type  — maps to AlertType enum value (default: unusual_behavior)
          cat_id      — UUID string (optional if event payload contains it)
        """
        if not event.user_id:
            logger.warning("SEND_NOTIFICATION skipped — event has no user_id")
            return

        # Import here to avoid circular imports at module load time
        from app.services.notification_service import NotificationService

        title = config.get("title") or _default_title(event)
        message = config.get("message") or _default_message(event)
        severity = config.get("severity", "medium")
        alert_type = config.get("alert_type", "unusual_behavior")
        cat_id = config.get("cat_id") or event.payload.get("cat_id")

        svc = NotificationService()
        await svc.send(
            user_id=event.user_id,
            title=title,
            message=message,
            severity=severity,
            alert_type=alert_type,
            cat_id=cat_id,
            event=event,
        )

    async def _send_webhook(self, url: str | None, event: DomainEvent) -> None:
        if not url:
            logger.warning("SEND_WEBHOOK skipped — no url in action_config")
            return
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    url,
                    json={"event": event.event_type, "payload": event.payload},
                    timeout=5.0,
                )
                logger.info(f"Webhook delivered to {url}")
            except Exception as e:
                logger.error(f"Webhook delivery failed: {e}")


# ─── helpers ──────────────────────────────────────────────────────────────────

def _default_title(event: DomainEvent) -> str:
    titles = {
        "cat.detected":      "Cat detected",
        "cat.identified":    "Cat identified",
        "audio.vocalization": "Vocalization detected",
        "behavior.anomaly":  "Unusual behavior detected",
        "motion.detected":   "Motion detected",
    }
    return titles.get(event.event_type, "PawCare alert")


def _default_message(event: DomainEvent) -> str:
    label = event.payload.get("label") or event.payload.get("class_name") or ""
    conf = event.payload.get("confidence")
    conf_str = f" ({conf:.0%} confidence)" if conf else ""
    return f"{label.capitalize()}{conf_str} — {event.event_type}".strip(" —")