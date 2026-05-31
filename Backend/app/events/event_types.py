from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from enum import Enum
import uuid


class EventType(str, Enum):
    # Vision events
    CAT_DETECTED = "cat.detected"
    CAT_IDENTIFIED = "cat.identified"
    MOTION_DETECTED = "motion.detected"

    # Audio events
    VOCALIZATION_DETECTED = "audio.vocalization"
    UNUSUAL_SOUND = "audio.unusual_sound"

    # Behavior events
    ANOMALY_DETECTED = "behavior.anomaly"
    ACTIVITY_UPDATED = "behavior.activity_updated"

    # System events
    ALERT_CREATED = "alert.created"
    AUTOMATION_TRIGGERED = "automation.triggered"


@dataclass
class DomainEvent:
    event_type: EventType
    payload: dict[str, Any]
    source: str = "system"
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None