from fastapi.testclient import TestClient

from app.core.config import settings


def test_request_id_header_is_attached(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/")

    assert response.status_code == 200
    assert response.headers.get("x-request-id")


def test_unhandled_exception_returns_problem_details(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/private/boom")
    payload = response.json()

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert payload["type"] == "about:blank"
    assert payload["title"] == "Internal Server Error"
    assert payload["status"] == 500
    assert payload["detail"] == "An unexpected error occurred."
    assert payload["instance"] == "/api/v1/private/boom"
    assert payload["request_id"] == response.headers.get("x-request-id")
