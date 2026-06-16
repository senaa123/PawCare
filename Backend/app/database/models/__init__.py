# app/database/models/__init__.py — UPDATED FILE

from app.database.models.user import User
from app.database.models.cat import Cat
from app.database.models.alert import Alert
from app.database.models.automation import AutomationRule
from app.database.models.event import CatEvent
from app.database.models.camera_stream import CameraStream
from app.database.models.detection_event import DetectionEvent
from app.database.models.activity_session import ActivitySession

__all__ = [
    "User",
    "Cat",
    "Alert",
    "AutomationRule",
    "CatEvent",
    "CameraStream",
    "DetectionEvent",
    "ActivitySession",
]