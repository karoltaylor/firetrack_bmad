import httpx
from fastapi import APIRouter, HTTPException, Query

from app.models import EcbRatesPublic

router = APIRouter(prefix="/rates", tags=["rates"])

FRANKFURTER_LATEST_URL = "https://api.frankfurter.app/latest"
UPSTREAM_ERROR_MESSAGE = "Unable to fetch latest exchange rates."


@router.get("/latest", response_model=EcbRatesPublic)
async def read_latest_rates(
    base_currency: str = Query(
        default="EUR",
        alias="from",
        min_length=3,
        max_length=3,
        pattern=r"^[A-Za-z]{3}$",
    ),
) -> EcbRatesPublic:
    normalized_base_currency = base_currency.upper()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                FRANKFURTER_LATEST_URL, params={"from": normalized_base_currency}
            )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=UPSTREAM_ERROR_MESSAGE) from exc

    as_of = payload.get("date")
    rates_payload = payload.get("rates")
    if not isinstance(as_of, str) or not isinstance(rates_payload, dict):
        raise HTTPException(status_code=503, detail=UPSTREAM_ERROR_MESSAGE)

    rates: dict[str, float] = {}
    for currency_code, rate in rates_payload.items():
        if isinstance(currency_code, str) and isinstance(rate, (int, float)):
            rates[currency_code.upper()] = float(rate)

    rates[normalized_base_currency] = 1.0
    return EcbRatesPublic(as_of=as_of, rates=rates)
