from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, cast

import redis

from app.core.config import settings

SESSION_TTL_SECONDS = 31 * 24 * 60 * 60


class SessionStoreUnavailable(RuntimeError):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class RefreshSession:
    user_id: str
    nonce: str
    created_at: datetime
    last_used_at: datetime
    revoked_at: datetime | None = None


_lock = threading.Lock()
_sessions: dict[str, RefreshSession] = {}
_user_sessions: dict[str, set[str]] = {}
_redis_client: Any = None


def _session_key(session_id: str) -> str:
    return f"auth:refresh-session:{session_id}"


def _user_sessions_key(user_id: str) -> str:
    return f"auth:user-sessions:{user_id}"


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _get_redis_client() -> Any:
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.ping()
            return _redis_client
        except redis.RedisError:
            _redis_client = None
    try:
        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.25,
            socket_timeout=0.25,
        )
        client.ping()
        _redis_client = client
    except redis.RedisError:
        _redis_client = None
    return _redis_client


def _allow_in_memory_fallback() -> bool:
    return settings.ENVIRONMENT == "local"


def _resolve_store() -> Any:
    client = _get_redis_client()
    if client:
        return client
    if not _allow_in_memory_fallback():
        raise SessionStoreUnavailable(
            "Refresh session store is unavailable; refusing non-local in-memory fallback."
        )
    return None


def _user_session_ids(user_id: str) -> set[str]:
    return _user_sessions.setdefault(user_id, set())


def _prune_in_memory(now: datetime, max_age: timedelta) -> None:
    expired_ids: set[str] = set()
    for session_id, session in _sessions.items():
        expired = now - session.last_used_at > max_age
        if session.revoked_at is not None and expired:
            expired_ids.add(session_id)
    for session_id in expired_ids:
        session = _sessions.pop(session_id)
        user_sessions = _user_sessions.get(session.user_id)
        if not user_sessions:
            continue
        user_sessions.discard(session_id)
        if not user_sessions:
            _user_sessions.pop(session.user_id, None)


def create_refresh_session(user_id: str) -> tuple[str, str]:
    now = utc_now()
    session_id = str(uuid.uuid4())
    nonce = str(uuid.uuid4())
    client = _resolve_store()
    if client:
        try:
            session_key = _session_key(session_id)
            user_key = _user_sessions_key(user_id)
            now_iso = now.isoformat()
            pipeline = client.pipeline()
            pipeline.hset(
                session_key,
                mapping={
                    "user_id": user_id,
                    "nonce": nonce,
                    "created_at": now_iso,
                    "last_used_at": now_iso,
                    "revoked_at": "",
                },
            )
            pipeline.expire(session_key, SESSION_TTL_SECONDS)
            pipeline.sadd(user_key, session_id)
            pipeline.expire(user_key, SESSION_TTL_SECONDS)
            pipeline.execute()
            return session_id, nonce
        except redis.RedisError as exc:
            raise SessionStoreUnavailable("Unable to create refresh session.") from exc

    session = RefreshSession(
        user_id=user_id,
        nonce=nonce,
        created_at=now,
        last_used_at=now,
    )
    with _lock:
        _sessions[session_id] = session
        _user_session_ids(user_id).add(session_id)
    return session_id, nonce


def rotate_refresh_session(
    *, user_id: str, session_id: str, nonce: str, max_inactive: timedelta
) -> tuple[bool, str | None]:
    now = utc_now()
    client = _resolve_store()
    if client:
        session_key = _session_key(session_id)
        user_key = _user_sessions_key(user_id)
        try:
            for _ in range(5):
                pipeline = client.pipeline()
                try:
                    pipeline.watch(session_key)
                    session_data = cast(dict[str, str], pipeline.hgetall(session_key))
                    if not session_data:
                        return False, None
                    if session_data.get("user_id") != user_id:
                        return False, None
                    if session_data.get("revoked_at"):
                        return False, None
                    if session_data.get("nonce") != nonce:
                        return False, None

                    last_used_at = _parse_datetime(session_data.get("last_used_at"))
                    if not last_used_at or now - last_used_at > max_inactive:
                        pipeline.multi()
                        pipeline.hset(session_key, mapping={"revoked_at": now.isoformat()})
                        pipeline.expire(session_key, SESSION_TTL_SECONDS)
                        pipeline.execute()
                        return False, None

                    new_nonce = str(uuid.uuid4())
                    pipeline.multi()
                    pipeline.hset(
                        session_key,
                        mapping={"nonce": new_nonce, "last_used_at": now.isoformat()},
                    )
                    pipeline.expire(session_key, SESSION_TTL_SECONDS)
                    pipeline.expire(user_key, SESSION_TTL_SECONDS)
                    pipeline.execute()
                    return True, new_nonce
                except redis.WatchError:
                    continue
                finally:
                    pipeline.reset()
        except redis.RedisError as exc:
            raise SessionStoreUnavailable("Unable to rotate refresh session.") from exc
        return False, None

    with _lock:
        _prune_in_memory(now, max_inactive)
        session = _sessions.get(session_id)
        if not session or session.user_id != user_id:
            return False, None
        if session.revoked_at is not None:
            return False, None
        if session.nonce != nonce:
            return False, None
        if now - session.last_used_at > max_inactive:
            session.revoked_at = now
            return False, None

        new_nonce = str(uuid.uuid4())
        session.nonce = new_nonce
        session.last_used_at = now
        return True, new_nonce


def revoke_all_user_sessions(user_id: str) -> int:
    now = utc_now()
    client = _resolve_store()
    if client:
        try:
            user_key = _user_sessions_key(user_id)
            session_ids = cast(set[str], client.smembers(user_key))
            if not session_ids:
                return 0

            revoked_count = 0
            pipeline = client.pipeline()
            for session_id in session_ids:
                session_key = _session_key(session_id)
                revoked_at = client.hget(session_key, "revoked_at")
                if revoked_at is None:
                    continue
                if not revoked_at:
                    pipeline.hset(session_key, mapping={"revoked_at": now.isoformat()})
                    revoked_count += 1
                pipeline.expire(session_key, SESSION_TTL_SECONDS)
            pipeline.expire(user_key, SESSION_TTL_SECONDS)
            pipeline.execute()
            return revoked_count
        except redis.RedisError as exc:
            raise SessionStoreUnavailable("Unable to revoke refresh sessions.") from exc

    with _lock:
        _prune_in_memory(now, timedelta(days=31))
        memory_session_ids = list(_user_session_ids(user_id))
        revoked_count = 0
        for session_id in memory_session_ids:
            session = _sessions.get(session_id)
            if session and session.revoked_at is None:
                session.revoked_at = now
                revoked_count += 1
        return revoked_count
