from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.core.config import settings


def test_read_latest_rates_returns_normalized_snapshot(client: TestClient) -> None:
    upstream_response = httpx.Response(
        200,
        request=httpx.Request("GET", "https://api.frankfurter.app/latest"),
        json={"date": "2026-04-24", "rates": {"USD": 1.09, "pln": 4.27}},
    )

    with patch("app.api.routes.rates.httpx.AsyncClient") as async_client:
        mock_http_client = AsyncMock()
        mock_http_client.get.return_value = upstream_response
        async_client.return_value.__aenter__.return_value = mock_http_client

        response = client.get(f"{settings.API_V1_STR}/rates/latest", params={"from": "usd"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["as_of"] == "2026-04-24"
    assert payload["rates"]["USD"] == 1
    assert payload["rates"]["PLN"] == 4.27
    mock_http_client.get.assert_awaited_once_with(
        "https://api.frankfurter.app/latest", params={"from": "USD"}
    )


def test_read_latest_rates_returns_503_when_upstream_fails(client: TestClient) -> None:
    upstream_response = httpx.Response(
        500,
        request=httpx.Request("GET", "https://api.frankfurter.app/latest"),
        json={"error": "boom"},
    )

    with patch("app.api.routes.rates.httpx.AsyncClient") as async_client:
        mock_http_client = AsyncMock()
        mock_http_client.get.return_value = upstream_response
        async_client.return_value.__aenter__.return_value = mock_http_client

        response = client.get(f"{settings.API_V1_STR}/rates/latest")

    assert response.status_code == 503
    assert response.json() == {"detail": "Unable to fetch latest exchange rates."}


def test_read_latest_rates_returns_503_when_upstream_payload_is_invalid(
    client: TestClient,
) -> None:
    upstream_response = httpx.Response(
        200,
        request=httpx.Request("GET", "https://api.frankfurter.app/latest"),
        json={"date": None, "rates": []},
    )

    with patch("app.api.routes.rates.httpx.AsyncClient") as async_client:
        mock_http_client = AsyncMock()
        mock_http_client.get.return_value = upstream_response
        async_client.return_value.__aenter__.return_value = mock_http_client

        response = client.get(f"{settings.API_V1_STR}/rates/latest")

    assert response.status_code == 503
    assert response.json() == {"detail": "Unable to fetch latest exchange rates."}
