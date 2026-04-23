from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import ALGORITHM
from app.crud import create_user
from app.models import UserCreate
from tests.utils.utils import random_email


def _auth_header(ip: str) -> dict[str, str]:
    return {"X-Forwarded-For": ip}


def test_auth_login_returns_access_and_refresh_tokens(client: TestClient, db: Session) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.20"),
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["refresh_token"]

    access_claims = jwt.decode(
        payload["access_token"], settings.SECRET_KEY, algorithms=[ALGORITHM]
    )
    refresh_claims = jwt.decode(
        payload["refresh_token"], settings.SECRET_KEY, algorithms=[ALGORITHM]
    )

    access_expiry = datetime.fromtimestamp(access_claims["exp"], tz=timezone.utc)
    time_remaining = access_expiry - datetime.now(timezone.utc)
    assert timedelta(minutes=14) <= time_remaining <= timedelta(minutes=16)

    refresh_expiry = datetime.fromtimestamp(refresh_claims["exp"], tz=timezone.utc)
    refresh_time_remaining = refresh_expiry - datetime.now(timezone.utc)
    assert timedelta(days=29) <= refresh_time_remaining <= timedelta(days=31)
    assert refresh_claims["typ"] == "refresh"
    assert refresh_claims["sid"]
    assert refresh_claims["nonce"]


def test_auth_login_invalid_credentials_returns_generic_401(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    wrong_password = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.21"),
        json={"email": email, "password": "wrong-password"},
    )
    unknown_user = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.22"),
        json={"email": random_email(), "password": password},
    )

    assert wrong_password.status_code == 401
    assert unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == "Invalid email or password."
    assert unknown_user.json()["detail"] == "Invalid email or password."


def test_refresh_rotates_tokens_and_rejects_old_refresh(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.23"),
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    first_refresh_token = login.json()["refresh_token"]

    refresh = client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        headers=_auth_header("198.51.100.24"),
        json={"refresh_token": first_refresh_token},
    )
    assert refresh.status_code == 200
    second_refresh_token = refresh.json()["refresh_token"]
    assert second_refresh_token != first_refresh_token

    old_refresh_attempt = client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        headers=_auth_header("198.51.100.25"),
        json={"refresh_token": first_refresh_token},
    )
    assert old_refresh_attempt.status_code == 401
    assert old_refresh_attempt.json()["detail"] == "Invalid or expired refresh token."


def test_invalidate_all_sessions_revokes_refresh_tokens(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    first_login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.26"),
        json={"email": email, "password": password},
    )
    second_login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.31"),
        json={"email": email, "password": password},
    )
    assert first_login.status_code == 200
    assert second_login.status_code == 200
    access_token = first_login.json()["access_token"]
    refresh_tokens = [
        first_login.json()["refresh_token"],
        second_login.json()["refresh_token"],
    ]

    invalidate = client.post(
        f"{settings.API_V1_STR}/auth/sessions/invalidate-all",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Forwarded-For": "198.51.100.27",
        },
    )
    assert invalidate.status_code == 200
    assert invalidate.json()["message"] == "All sessions invalidated."

    for index, refresh_token in enumerate(refresh_tokens):
        refresh_after_invalidate = client.post(
            f"{settings.API_V1_STR}/auth/refresh",
            headers=_auth_header(f"198.51.100.{32 + index}"),
            json={"refresh_token": refresh_token},
        )
        assert refresh_after_invalidate.status_code == 401
        assert (
            refresh_after_invalidate.json()["detail"]
            == "Invalid or expired refresh token."
        )


def test_refresh_token_inactivity_expiry_rejects_after_30_days(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.29"),
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    with patch(
        "app.core.auth_sessions.utc_now",
        return_value=datetime.now(timezone.utc) + timedelta(days=31),
    ):
        stale_refresh = client.post(
            f"{settings.API_V1_STR}/auth/refresh",
            headers=_auth_header("198.51.100.30"),
            json={"refresh_token": refresh_token},
        )
    assert stale_refresh.status_code == 401
    assert stale_refresh.json()["detail"] == "Invalid or expired refresh token."


def test_auth_login_rate_limit_returns_429(client: TestClient) -> None:
    last_response = None
    for _ in range(11):
        last_response = client.post(
            f"{settings.API_V1_STR}/auth/login",
            headers=_auth_header("198.51.100.40"),
            json={"email": random_email(), "password": "StrongPassword!123"},
        )
    assert last_response is not None
    assert last_response.status_code == 429
    assert "Retry-After" in last_response.headers


def test_auth_refresh_rate_limit_returns_429(client: TestClient) -> None:
    last_response = None
    for _ in range(16):
        last_response = client.post(
            f"{settings.API_V1_STR}/auth/refresh",
            headers=_auth_header("198.51.100.41"),
            json={"refresh_token": "invalid-refresh-token"},
        )
    assert last_response is not None
    assert last_response.status_code == 429
    assert "Retry-After" in last_response.headers


def test_refresh_token_cannot_access_bearer_protected_route(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = "StrongPassword!123"
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    login = client.post(
        f"{settings.API_V1_STR}/auth/login",
        headers=_auth_header("198.51.100.42"),
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    protected_call = client.post(
        f"{settings.API_V1_STR}/auth/sessions/invalidate-all",
        headers={
            "Authorization": f"Bearer {refresh_token}",
            "X-Forwarded-For": "198.51.100.43",
        },
    )
    assert protected_call.status_code == 403
    assert protected_call.json()["detail"] == "Could not validate credentials"
