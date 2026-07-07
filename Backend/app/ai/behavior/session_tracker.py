# app/ai/behavior/session_tracker.py

import asyncio
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ── Tuning constants ──────────────────────────────────────────────────────────
TIMEOUT_SECONDS = 30  # close session if track not seen for this long
DEBOUNCE_FRAMES = 3   # consecutive frames of new label before committing switch


@dataclass
class TrackState:
    session_id:       uuid.UUID
    track_id:         str
    current_activity: str
    started_at:       datetime
    last_seen:        datetime
    user_id:          str
    cat_id:           Optional[str] = None
    # Debounce state
    pending_activity: Optional[str] = None
    pending_count:    int = 0


class SessionTracker:
    """
    In-memory state machine: one TrackState per (user_id, track_id).

    State transitions:
      New track seen       → INSERT open session into DB
      Activity unchanged   → update last_seen only (no DB write)
      Activity changes     → debounce; on commit: close old + open new
      Track times out      → close session at last_seen timestamp
      cat_id backfill      → UPDATE session row when face recognition runs

    All DB work is done via module-level helpers (_db_open, _db_close,
    _db_backfill) so they can be fire-and-forget task-created without
    holding the lock.
    """

    def __init__(self) -> None:
        self._states: dict[tuple[str, str], TrackState] = {}
        self._lock = asyncio.Lock()

    # ─── Public interface ─────────────────────────────────────────────────

    async def process_detection(
        self,
        track_id: str,
        activity: str,
        user_id: str,
        cat_id: Optional[str] = None,
    ) -> None:
        """Called for every cat detected in a frame."""
        key = (user_id, track_id)
        now = datetime.now(timezone.utc)

        async with self._lock:
            state = self._states.get(key)

            # ── New track ─────────────────────────────────────────────────
            if state is None:
                session_id = await _db_open(track_id, activity, user_id, cat_id, now)
                if session_id:
                    self._states[key] = TrackState(
                        session_id=session_id,
                        track_id=track_id,
                        current_activity=activity,
                        started_at=now,
                        last_seen=now,
                        user_id=user_id,
                        cat_id=cat_id,
                    )
                return

            # ── Existing track ────────────────────────────────────────────
            state.last_seen = now

            # Backfill cat_id once face recognition identifies this track
            if cat_id and not state.cat_id:
                state.cat_id = cat_id
                asyncio.create_task(_db_backfill(state.session_id, cat_id))

            # Activity unchanged — heartbeat only, no DB write
            if activity == state.current_activity:
                state.pending_activity = None
                state.pending_count = 0
                return

            # ── Debounce new activity ─────────────────────────────────────
            if activity == state.pending_activity:
                state.pending_count += 1
            else:
                state.pending_activity = activity
                state.pending_count = 1

            if state.pending_count >= DEBOUNCE_FRAMES:
                old_activity = state.current_activity
                # Close current session
                await _db_close(state.session_id, now, state.started_at, state)
                # Open new session for the new activity
                new_id = await _db_open(track_id, activity, user_id, state.cat_id, now)
                if new_id:
                    state.session_id = new_id
                    state.current_activity = activity
                    state.started_at = now
                    state.pending_activity = None
                    state.pending_count = 0
                    logger.info(
                        f"Activity switch: track={track_id} "
                        f"{old_activity!r} → {activity!r} user={user_id[:8]}"
                    )

    async def sweep_timeouts(self) -> int:
        """
        Close sessions for tracks not seen within TIMEOUT_SECONDS.
        Called by the background sweep loop in main.py every 30 seconds.
        Returns the number of sessions closed.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=TIMEOUT_SECONDS)
        timed_out: list[tuple[tuple[str, str], TrackState]] = []

        async with self._lock:
            for key, state in list(self._states.items()):
                if state.last_seen < cutoff:
                    timed_out.append((key, state))
            for key, _ in timed_out:
                del self._states[key]

        for _, state in timed_out:
            # Close at last_seen, not now — avoids inflating duration
            await _db_close(state.session_id, state.last_seen, state.started_at, state)

        if timed_out:
            logger.info(f"sweep_timeouts: closed {len(timed_out)} session(s)")
        return len(timed_out)

    async def close_all_for_user(self, user_id: str) -> None:
        """Force-close all open sessions for a user (camera disconnect)."""
        now = datetime.now(timezone.utc)
        to_close: list[TrackState] = []

        async with self._lock:
            for key in list(self._states):
                if key[0] == user_id:
                    to_close.append(self._states.pop(key))

        for state in to_close:
            await _db_close(state.session_id, now, state.started_at, state)

    def active_count(self) -> int:
        """How many tracks are currently being tracked in memory."""
        return len(self._states)


# ─── Module-level DB helpers ──────────────────────────────────────────────────
# Free functions (not methods) so they can be fire-and-forget task-created
# without holding the tracker lock.

async def _db_open(
    track_id: str,
    activity: str,
    user_id: str,
    cat_id: Optional[str],
    started_at: datetime,
) -> Optional[uuid.UUID]:
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.models.activity_session import ActivitySession
        from app.events.event_bus import event_bus
        from app.events.event_types import DomainEvent, EventType

        async with AsyncSessionLocal() as db:
            async with db.begin():
                row = ActivitySession(
                    user_id=uuid.UUID(user_id) if user_id else None,
                    cat_id=uuid.UUID(cat_id) if cat_id else None,
                    track_id=track_id,
                    activity=activity,
                    started_at=started_at,
                )
                db.add(row)
                await db.flush()
                session_id = row.id

        await event_bus.publish(DomainEvent(
            event_type=EventType.ACTIVITY_UPDATED,
            payload={
                "session_id": str(session_id),
                "track_id":   track_id,
                "cat_id":     cat_id,
                "activity":   activity,
                "status":     "started",
                "started_at": started_at.isoformat(),
            },
            source="session_tracker",
            user_id=user_id,
        ))
        logger.debug(f"Opened session id={session_id} track={track_id} activity={activity!r}")
        return session_id

    except Exception:
        logger.exception(f"_db_open failed track={track_id}")
        return None


async def _db_close(
    session_id: uuid.UUID,
    ended_at: datetime,
    started_at: datetime,
    state: TrackState,
) -> None:
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.models.activity_session import ActivitySession
        from app.events.event_bus import event_bus
        from app.events.event_types import DomainEvent, EventType
        from sqlalchemy import update

        duration = max(0, int((ended_at - started_at).total_seconds()))

        async with AsyncSessionLocal() as db:
            async with db.begin():
                await db.execute(
                    update(ActivitySession)
                    .where(ActivitySession.id == session_id)
                    .values(ended_at=ended_at, duration_seconds=duration)
                )

        await event_bus.publish(DomainEvent(
            event_type=EventType.ACTIVITY_UPDATED,
            payload={
                "session_id":       str(session_id),
                "track_id":         state.track_id,
                "cat_id":           state.cat_id,
                "activity":         state.current_activity,
                "status":           "ended",
                "ended_at":         ended_at.isoformat(),
                "duration_seconds": duration,
            },
            source="session_tracker",
            user_id=state.user_id,
        ))
        logger.debug(f"Closed session id={session_id} duration={duration}s")

    except Exception:
        logger.exception(f"_db_close failed session_id={session_id}")


async def _db_backfill(session_id: uuid.UUID, cat_id: str) -> None:
    """Backfill cat_id on an open session when face recognition identifies the track."""
    try:
        from app.database.connection import AsyncSessionLocal
        from app.database.models.activity_session import ActivitySession
        from sqlalchemy import update

        async with AsyncSessionLocal() as db:
            async with db.begin():
                await db.execute(
                    update(ActivitySession)
                    .where(ActivitySession.id == session_id)
                    .values(cat_id=uuid.UUID(cat_id))
                )
        logger.debug(f"Backfilled cat_id={cat_id} on session {session_id}")

    except Exception:
        logger.exception("_db_backfill failed")


# Application-scoped singleton
session_tracker = SessionTracker()