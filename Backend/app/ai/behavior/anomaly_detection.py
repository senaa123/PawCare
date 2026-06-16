import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    is_anomaly: bool
    score: float
    reason: Optional[str] = None


class AnomalyDetector:
    """
    Detects behavioral anomalies from activity sequences.
    Initial version uses rule-based heuristics.
    Future: swap for IsolationForest or LSTM-based detector.
    """

    def analyze(self, activity_window: list[str]) -> AnomalyResult:
        if not activity_window:
            return AnomalyResult(is_anomaly=False, score=0.0)

        # Heuristic: if activity hasn't changed in last N observations
        unique = set(activity_window[-10:])
        if len(unique) == 1 and "sleeping" not in unique:
            return AnomalyResult(
                is_anomaly=True,
                score=0.85,
                reason=f"Stuck in activity: {unique.pop()} for extended period",
            )

        return AnomalyResult(is_anomaly=False, score=0.1)