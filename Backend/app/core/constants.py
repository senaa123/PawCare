from enum import Enum


class CatActivityStatus(str, Enum):
    SLEEPING = "sleeping"
    EATING = "eating"
    PLAYING = "playing"
    GROOMING = "grooming"
    IDLE = "idle"
    UNKNOWN = "unknown"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    UNUSUAL_BEHAVIOR = "unusual_behavior"
    HEALTH_CONCERN = "health_concern"
    FEEDING_REMINDER = "feeding_reminder"
    INTRUDER_DETECTED = "intruder_detected"
    CAT_MISSING = "cat_missing"
    AUDIO_EVENT = "audio_event"


class AutomationTrigger(str, Enum):
    MOTION_DETECTED = "motion_detected"
    CAT_IDENTIFIED = "cat_identified"
    SOUND_DETECTED = "sound_detected"
    SCHEDULED = "scheduled"
    MANUAL = "manual"


class AutomationAction(str, Enum):
    SEND_NOTIFICATION = "send_notification"
    TRIGGER_FEEDER = "trigger_feeder"
    RECORD_VIDEO = "record_video"
    PLAY_SOUND = "play_sound"
    SEND_WEBHOOK = "send_webhook"