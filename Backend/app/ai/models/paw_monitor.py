"""
Roboflow behavior model helper.

This model classifies the cat's current movement/posture, for example sitting,
standing, or lying. It is not the anomaly model. Anomaly detection should use
stored per-cat routine history from the backend database.
"""

import os
from dataclasses import dataclass
from typing import Any

import cv2


DEFAULT_MODEL_ID = "cats-behaviors-test-ygn1v/1"


@dataclass
class BehaviorPrediction:
    behavior: str
    confidence: float


class RoboflowBehaviorModel:
    def __init__(self, model_id: str = DEFAULT_MODEL_ID, api_key: str | None = None):
        self.model_id = model_id
        self.api_key = api_key or os.getenv("ROBOFLOW_API_KEY")
        self._model: Any | None = None

        if not self.api_key:
            raise RuntimeError("Set ROBOFLOW_API_KEY before loading the Roboflow behavior model.")

    def _load(self):
        if self._model is None:
            from inference import get_model

            self._model = get_model(model_id=self.model_id, api_key=self.api_key)

    def predict(self, frame) -> list[BehaviorPrediction]:
        self._load()
        results = self._model.infer(frame)[0]
        return [
            BehaviorPrediction(
                behavior=prediction.class_name,
                confidence=float(prediction.confidence),
            )
            for prediction in results.predictions
        ]


def run_camera_preview(camera_index: int = 0) -> None:
    model = RoboflowBehaviorModel()
    camera = cv2.VideoCapture(camera_index)

    print("PawCare behavior model is active. Press 'q' to exit.")

    while True:
        ok, frame = camera.read()
        if not ok:
            print("Failed to grab frame from camera.")
            break

        for prediction in model.predict(frame):
            print(f"Cat behavior: {prediction.behavior} ({prediction.confidence:.2%})")

        cv2.imshow("PawCare Behavior Model", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_camera_preview()
