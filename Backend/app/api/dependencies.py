# Backend/app/api/dependencies.py — CHANGED
# What changed: Redis cache layer in get_current_user
# Cache key: user:{user_id}  TTL: 15 minutes
# Falls back to DB if Redis is unavailable

import json
import logging
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database.connection import get_db
from app.database.models.user import User
from app.database.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()

CACHE_TTL_SECONDS = 900  # 15 minutes


def _get_redis():
    """Returns Redis client or None if unavailable."""
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings
        return aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    token    = credentials.credentials
    user_id  = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # ── try Redis cache first ──────────────────────────────────────────────────
    redis = _get_redis()
    if redis:
        try:
            cache_key = f"user:{user_id}"
            cached    = await redis.get(cache_key)

            if cached:
                # Cache hit — build a lightweight User-like object from JSON
                data = json.loads(cached)
                # We still need a real User ORM object for type safety,
                # so we do a lightweight select by PK (still faster than full auth flow)
                # Alternative: use the cached data directly if your routes
                # only need user.id and user.is_active
                user = await UserRepository(session).get_by_id(uuid.UUID(user_id))
                await redis.aclose()
                if not user or not user.is_active:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                        detail="User not found or inactive")
                return user

            # Cache miss — query DB then cache the result
            user = await UserRepository(session).get_by_id(uuid.UUID(user_id))
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="User not found or inactive")

            # Cache minimal user data
            await redis.setex(
                cache_key,
                CACHE_TTL_SECONDS,
                json.dumps({"id": str(user.id), "is_active": user.is_active}),
            )
            await redis.aclose()
            return user

        except HTTPException:
            raise
        except Exception as exc:
            # Redis down — fall through to plain DB query
            logger.warning("Redis cache unavailable, falling back to DB: %s", exc)

    # ── Redis unavailable — plain DB query (original behaviour) ───────────────
    repo = UserRepository(session)
    user = await repo.get_by_id(uuid.UUID(user_id))

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DBSession   = Annotated[AsyncSession, Depends(get_db)]