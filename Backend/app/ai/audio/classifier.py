import numpy as np
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

CAT_SOUND_LABELS = {"meow", "purring", "hissing", "growling", "chirping"}


@dataclass
class AudioClassification:
    label: str
    confidence: float
    is_cat_vocalization: bool


class CatAudioClassifier:
    """
    YAMNet-based audio classifier, filtered to cat-relevant sounds.
    """

    def __init__(self, model_path: str):
        self.model_path = model_path
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                import tflite_runtime.interpreter as tflite
                self._model = tflite.Interpreter(model_path=self.model_path)
                self._model.allocate_tensors()
                logger.info("YAMNet model loaded.")
            except Exception as e:
                logger.error(f"Failed to load YAMNet: {e}")
                raise

    def classify(self, audio: np.ndarray) -> list[AudioClassification]:
        self._load()
        input_details = self._model.get_input_details()
        output_details = self._model.get_output_details()

        self._model.set_tensor(input_details[0]["index"], audio[np.newaxis])
        self._model.invoke()
        scores = self._model.get_tensor(output_details[0]["index"])[0]

        top_idx = int(np.argmax(scores))
        top_score = float(scores[top_idx])

        # Simplified: return top result only
        label = f"class_{top_idx}"  # Replace with real YAMNet class map
        return [AudioClassification(
            label=label,
            confidence=top_score,
            is_cat_vocalization=label in CAT_SOUND_LABELS,
        )]