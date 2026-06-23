import logging
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Sequence

from app.database.models.activity_session import ActivitySession


logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    is_anomaly: bool
    score: float
    reason: Optional[str] = None
    anomaly_type: Optional[str] = None


class RoutineAnomalyDetector:
    """
    Compares current behavior against a cat's own recent routine.

    This is intentionally separate from the Roboflow behavior model:
    - Roboflow answers: "what is the cat doing now?"
    - This detector answers: "is this unusual for this cat's routine?"
    """

    def __init__(
        self,
        baseline_days: int = 3,
        min_baseline_days: int = 2,
        time_bucket_hours: int = 2,
    ):
        self.baseline_days = baseline_days
        self.min_baseline_days = min_baseline_days
        self.time_bucket_hours = time_bucket_hours

    def analyze_activity_change(
        self,
        current_activity: str,
        baseline_sessions: Sequence[ActivitySession],
        observed_at: datetime,
    ) -> AnomalyResult:
        if not baseline_sessions:
            return AnomalyResult(False, 0.0, "Collecting routine baseline")

        oldest = min(session.started_at for session in baseline_sessions)
        baseline_span = observed_at - oldest
        if baseline_span < timedelta(days=self.min_baseline_days):
            return AnomalyResult(False, 0.0, "Collecting routine baseline")

        same_time_sessions = [
            session for session in baseline_sessions
            if self._same_time_bucket(session.started_at, observed_at)
        ]

        if len(same_time_sessions) >= self.min_baseline_days:
            common_now = Counter(session.activity for session in same_time_sessions)
            if current_activity not in common_now:
                common_labels = ", ".join(label for label, _ in common_now.most_common(3))
                return AnomalyResult(
                    is_anomaly=True,
                    score=0.72,
                    anomaly_type="unusual_activity_time",
                    reason=(
                        f"{current_activity} is unusual around this time. "
                        f"Typical activities: {common_labels}"
                    ),
                )

        all_activity_counts = Counter(session.activity for session in baseline_sessions)
        if current_activity not in all_activity_counts and len(baseline_sessions) >= 8:
            return AnomalyResult(
                is_anomaly=True,
                score=0.68,
                anomaly_type="new_activity_pattern",
                reason=f"{current_activity} has not appeared in the recent routine baseline",
            )

        return AnomalyResult(False, 0.1)

    def analyze_missing_expected_activity(
        self,
        expected_activity: str,
        baseline_sessions: Sequence[ActivitySession],
        today_sessions: Sequence[ActivitySession],
        observed_at: datetime,
        minimum_expected_minutes: int = 5,
    ) -> AnomalyResult:
        """
        For scheduled checks: detect things like "Milo usually ate by now,
        but today has not eaten."
        """
        if not baseline_sessions:
            return AnomalyResult(False, 0.0, "Collecting routine baseline")

        expected_minutes = self._average_minutes_before_now(
            expected_activity,
            baseline_sessions,
            observed_at,
        )
        if expected_minutes < minimum_expected_minutes:
            return AnomalyResult(False, 0.05)

        today_minutes = self._minutes_before_now(expected_activity, today_sessions, observed_at)
        if today_minutes <= expected_minutes * 0.2:
            return AnomalyResult(
                is_anomaly=True,
                score=0.86,
                anomaly_type=f"missing_{expected_activity}",
                reason=(
                    f"Expected about {expected_minutes:.0f} minutes of {expected_activity} "
                    f"by now, but only saw {today_minutes:.0f} minutes"
                ),
            )

        return AnomalyResult(False, 0.1)

    def _same_time_bucket(self, baseline_time: datetime, observed_at: datetime) -> bool:
        hour_delta = abs(baseline_time.hour - observed_at.hour)
        hour_delta = min(hour_delta, 24 - hour_delta)
        return hour_delta <= self.time_bucket_hours

    def _average_minutes_before_now(
        self,
        activity: str,
        sessions: Sequence[ActivitySession],
        observed_at: datetime,
    ) -> float:
        by_day: dict[datetime.date, float] = {}
        for session in sessions:
            if session.activity != activity:
                continue
            if self._minute_of_day(session.started_at) > self._minute_of_day(observed_at):
                continue
            by_day.setdefault(session.started_at.date(), 0.0)
            by_day[session.started_at.date()] += self._session_minutes(session, observed_at)

        return sum(by_day.values()) / len(by_day) if by_day else 0.0

    def _minutes_before_now(
        self,
        activity: str,
        sessions: Sequence[ActivitySession],
        observed_at: datetime,
    ) -> float:
        return sum(
            self._session_minutes(session, observed_at)
            for session in sessions
            if session.activity == activity
            and self._minute_of_day(session.started_at) <= self._minute_of_day(observed_at)
        )

    @staticmethod
    def _minute_of_day(value: datetime) -> int:
        return value.hour * 60 + value.minute

    @staticmethod
    def _session_minutes(session: ActivitySession, fallback_end: datetime) -> float:
        ended_at = session.ended_at or fallback_end
        return max((ended_at - session.started_at).total_seconds() / 60, 0.0)


class AnomalyDetector(RoutineAnomalyDetector):
    """Backward-compatible name for older imports."""

    def analyze(self, activity_window: list[str]) -> AnomalyResult:
        if not activity_window:
            return AnomalyResult(is_anomaly=False, score=0.0)

        unique = set(activity_window[-10:])
        if len(unique) == 1 and "sleeping" not in unique:
            activity = unique.pop()
            return AnomalyResult(
                is_anomaly=True,
                score=0.85,
                anomaly_type="stuck_activity",
                reason=f"Stuck in activity: {activity} for extended period",
            )

        return AnomalyResult(is_anomaly=False, score=0.1)
