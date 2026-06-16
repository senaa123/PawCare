# app/core/config.py — FULL UPDATED FILE

from functools import lru_cache
from typing import List
import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # App
    APP_NAME: str = "PawCare"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # AI
    AI_CONFIDENCE_THRESHOLD: float = 0.65
    YOLO_MODEL_PATH: str = "app/ai/models/yolov8n.pt"
    FACE_MODEL_PATH: str = "app/ai/models/face_recognition.pkl"
    YAMNET_MODEL_PATH: str = "app/ai/models/yamnet.tflite"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()