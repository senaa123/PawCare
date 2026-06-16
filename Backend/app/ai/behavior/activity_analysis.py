from collections import Counter
from app.core.constants import CatActivityStatus


def summarize_activity(activity_window: list[str]) -> dict:
    """Produce a summary of activity distribution over a time window."""
    if not activity_window:
        return {}
    counts = Counter(activity_window)
    total = len(activity_window)
    return {activity: round(count / total, 2) for activity, count in counts.most_common()}


def infer_current_activity(recent_labels: list[str]) -> str:
    """Majority vote over recent detections."""
    if not recent_labels:
        return CatActivityStatus.UNKNOWN
    return Counter(recent_labels).most_common(1)[0][0]