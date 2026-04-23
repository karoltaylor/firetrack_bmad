from __future__ import annotations

from collections.abc import Mapping
from typing import Any, cast

import structlog
from sentry_sdk.types import Event, Hint

SENSITIVE_FIELDS = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "portfolio",
    "portfolio_value",
    "transaction",
    "transactions",
    "amount",
    "balance",
    "financial",
    "decrypted",
}


def configure_structlog() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.stdlib.add_logger_name,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def _scrub_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        scrubbed: dict[str, Any] = {}
        for key, nested_value in value.items():
            if key.lower() in SENSITIVE_FIELDS:
                scrubbed[key] = "[REDACTED]"
            else:
                scrubbed[key] = _scrub_value(nested_value)
        return scrubbed
    if isinstance(value, list):
        return [_scrub_value(item) for item in value]
    return value


def scrub_sentry_event(event: Event, _hint: Hint) -> Event | None:
    return cast(Event, _scrub_value(event))
