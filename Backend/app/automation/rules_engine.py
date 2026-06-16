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
            if rule.trigger != event.event_type:
                continue
            if not self._conditions_match(rule.conditions or {}, event.payload):
                continue
            logger.info(f"Rule '{rule.name}' triggered by {event.event_type}")
            await self._execute_action(rule.action, rule.action_config or {}, event)

    def _conditions_match(self, conditions: dict, payload: dict) -> bool:
        for key, expected in conditions.items():
            if payload.get(key) != expected:
                return False
        return True

    async def _execute_action(self, action: str, config: dict, event: DomainEvent) -> None:
        match action:
            case AutomationAction.SEND_NOTIFICATION:
                logger.info(f"ACTION: send_notification config={config}")
            case AutomationAction.TRIGGER_FEEDER:
                logger.info(f"ACTION: trigger_feeder config={config}")
            case AutomationAction.SEND_WEBHOOK:
                await self._send_webhook(config.get("url"), event)
            case _:
                logger.warning(f"Unknown action: {action}")

    async def _send_webhook(self, url: str | None, event: DomainEvent) -> None:
        if not url:
            return
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                await client.post(url, json={"event": event.event_type, "payload": event.payload})
            except Exception as e:
                logger.error(f"Webhook delivery failed: {e}")