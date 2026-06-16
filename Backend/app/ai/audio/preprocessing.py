import numpy as np
import io


def load_audio_bytes(audio_bytes: bytes, target_sr: int = 16000) -> np.ndarray:
    """
    Load raw audio bytes and resample to target sample rate.
    Returns mono float32 numpy array.
    """
    import wave
    with wave.open(io.BytesIO(audio_bytes)) as wf:
        n_channels = wf.getnchannels()
        framerate = wf.getframerate()
        raw = wf.readframes(wf.getnframes())

    audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

    # Convert to mono
    if n_channels > 1:
        audio = audio.reshape(-1, n_channels).mean(axis=1)

    # Resample if needed (basic linear interpolation for demo)
    if framerate != target_sr:
        duration = len(audio) / framerate
        target_len = int(duration * target_sr)
        audio = np.interp(
            np.linspace(0, len(audio), target_len),
            np.arange(len(audio)),
            audio,
        )

    return audio.astype(np.float32)