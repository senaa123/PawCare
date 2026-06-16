# app/automation/event_processor.py — FULL NEW FILE

import logging

from app.events.event_bus import event_bus
from app.events.event_types import DomainEvent, EventType
from app.automation.rules_engine import RulesEngine
from app.database.connection import AsyncSessionLocal
from app.database.repositories.automation_repository import AutomationRuleRepository

logger = logging.getLogger(__name__)

_rules_engine = RulesEngine()

# All event types that can trigger automation rules
_AUTOMATABLE_EVENTS = [
    EventType.CAT_DETECTED,
    EventType.CAT_IDENTIFIED,
    EventType.MOTION_DETECTED,
    EventType.VOCALIZATION_DETECTED,
    EventType.ANOMALY_DETECTED,
]


async def handle_automation_event(event: DomainEvent) -> None:
    """
    Receives a domain event, loads matching active rules from DB,
    and passes them to the rules engine for evaluation.
    """
    async with AsyncSessionLocal() as session:
        repo = AutomationRuleRepository(session)
        rules = await repo.get_active_by_trigger(event.event_type)

        if not rules:
            return

        logger.debug(f"Evaluating {len(rules)} rule(s) for event: {event.event_type}")
        await _rules_engine.evaluate(event, list(rules))


def register_automation_handlers() -> None:
    """Subscribe the automation processor to all automatable event types."""
    for event_type in _AUTOMATABLE_EVENTS:
        event_bus.subscribe(event_type, handle_automation_event)
    logger.info(f"Automation handlers registered for {len(_AUTOMATABLE_EVENTS)} event types.")