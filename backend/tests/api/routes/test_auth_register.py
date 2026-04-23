from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.crud import get_user_by_email


def _strong_password() -> str:
    return "StrongPassword!123"


def test_auth_register_success(client: TestClient, db: Session) -> None:
    payload = {"email": "register-success@example.com", "password": _strong_password()}

    response = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert "data" in body
    assert "user_id" in body["data"]
    created_user = get_user_by_email(session=db, email=payload["email"])
    assert created_user is not None
    assert created_user.hashed_password.startswith("$argon2")


def test_auth_register_invalid_email_problem_details(client: TestClient) -> None:
    payload = {"email": "not-an-email", "password": _strong_password()}

    response = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    body = response.json()

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert body["title"] == "Validation Error"
    assert body["field"] == "email"


def test_auth_register_weak_password_problem_details(client: TestClient) -> None:
    payload = {"email": "weak-password@example.com", "password": "weakpass"}

    response = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    body = response.json()

    assert response.status_code == 422
    assert body["field"] == "password"
    assert "at least 12 characters" in body["detail"]


def test_auth_register_duplicate_email_returns_generic_conflict(
    client: TestClient,
) -> None:
    payload = {"email": "duplicate-register@example.com", "password": _strong_password()}
    first = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    second = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    body = second.json()

    assert first.status_code == 201
    assert second.status_code == 409
    assert body["detail"] == "Unable to complete registration with provided credentials."


def test_auth_register_rate_limit_returns_retry_after(client: TestClient) -> None:
    statuses: list[int] = []
    retry_after_values: list[str] = []

    for index in range(7):
        payload = {
            "email": f"rate-limit-{index}@example.com",
            "password": _strong_password(),
        }
        response = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
        statuses.append(response.status_code)
        if "Retry-After" in response.headers:
            retry_after_values.append(response.headers["Retry-After"])

    assert 429 in statuses
    assert retry_after_values


def test_production_rejects_insecure_transport(client: TestClient) -> None:
    with patch("app.core.config.settings.ENVIRONMENT", "production"):
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["title"] == "Insecure Transport"
