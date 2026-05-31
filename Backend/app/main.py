import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import init_db, close_db
from app.api.routes import auth, cats, alerts, camera, audio, automation
from app.events.event_bus import event_bus

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle."""
    logger.info("PawCare backend starting up...")
    await init_db()
    await event_bus.start()
    yield
    logger.info("PawCare backend shutting down...")
    await event_bus.stop()
    await close_db()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["Auth"])
    app.include_router(cats.router,       prefix="/api/v1/cats",       tags=["Cats"])
    app.include_router(alerts.router,     prefix="/api/v1/alerts",     tags=["Alerts"])
    app.include_router(camera.router,     prefix="/api/v1/camera",     tags=["Camera"])
    app.include_router(audio.router,      prefix="/api/v1/audio",      tags=["Audio"])
    app.include_router(automation.router, prefix="/api/v1/automation", tags=["Automation"])

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

    return app


app = create_app()