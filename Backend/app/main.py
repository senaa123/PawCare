# app/main.py

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

from app.core.config import settings
from app.database.connection import init_db, close_db
from app.api.routes import auth, cats, alerts, camera, audio, automation, streams, detections, dashboard_ws, analytics
from app.events.event_bus import event_bus
from app.events.handlers import register_all_handlers
from app.automation.event_processor import register_automation_handlers
from app.utils.logging import configure_logging
from app.services.scheduler import start_scheduler, stop_scheduler


configure_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)


async def _session_sweep_loop() -> None:
    """Background task: closes sessions for cats that have left the camera frame."""
    from app.ai.behavior.session_tracker import session_tracker
    while True:
        await asyncio.sleep(30)
        try:
            await session_tracker.sweep_timeouts()
        except Exception:
            logger.exception("session_sweep_loop: unhandled error")


async def _close_orphaned_sessions() -> None:
    """Startup cleanup: close any sessions left open from the previous server run."""
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.repositories.activity_session_repository import ActivitySessionRepository
        async with AsyncSessionLocal() as db:
            async with db.begin():
                repo = ActivitySessionRepository(db)
                count = await repo.close_orphaned_sessions()
                if count:
                    logger.info(f"Startup cleanup: closed {count} orphaned session(s)")
    except Exception:
        logger.exception("_close_orphaned_sessions: failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PawCare backend starting up...")
    await init_db()
    await event_bus.start()
    register_all_handlers()        # ws + alert handlers
    register_automation_handlers() # rules engine handlers
    start_scheduler()              # start the anomaly check scheduler
    yield

    logger.info("PawCare backend shutting down...")
    stop_scheduler()
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

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["Auth"])
    app.include_router(cats.router,       prefix="/api/v1/cats",       tags=["Cats"])
    app.include_router(alerts.router,     prefix="/api/v1/alerts",     tags=["Alerts"])
    app.include_router(camera.router,     prefix="/api/v1/camera",     tags=["Camera"])
    app.include_router(audio.router,      prefix="/api/v1/audio",      tags=["Audio"])
    app.include_router(automation.router, prefix="/api/v1/automation", tags=["Automation"])
    app.include_router(streams.router,    prefix="/api/v1/streams",    tags=["Streams"])
    app.include_router(detections.router, prefix="/api/v1/detections", tags=["detections"])
    app.include_router(dashboard_ws.router, prefix="/api/v1/dashboard", tags=["dashboard"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
    
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


app = create_app()