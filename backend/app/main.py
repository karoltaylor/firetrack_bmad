import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sentry_sdk.integrations.fastapi import FastApiIntegration
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.api.main import api_router
from app.core.config import settings
from app.core.observability import configure_structlog, scrub_sentry_event
from app.core.rate_limit import limiter


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


logging.basicConfig(level=logging.INFO, format="%(message)s")
configure_structlog()
logger = structlog.get_logger(__name__)

if settings.SENTRY_ENABLED and settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(
        dsn=str(settings.SENTRY_DSN),
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=settings.ENVIRONMENT,
        integrations=[FastApiIntegration()],
        before_send=scrub_sentry_event,
    )

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)
app.state.limiter = limiter

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
app.add_middleware(SlowAPIMiddleware)


def _problem_details(
    *,
    request: Request,
    status_code: int,
    title: str,
    detail: str,
    request_id: str,
) -> dict[str, Any]:
    return {
        "type": "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": str(request.url.path),
        "request_id": request_id,
    }


@app.middleware("http")
async def enforce_https_in_production(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if settings.ENVIRONMENT == "production":
        forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if forwarded_proto != "https":
            request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
            return JSONResponse(
                status_code=400,
                media_type="application/problem+json",
                headers={"X-Request-ID": request_id},
                content=_problem_details(
                    request=request,
                    status_code=400,
                    title="Insecure Transport",
                    detail="HTTPS is required in production.",
                    request_id=request_id,
                ),
            )
    return await call_next(request)


@app.middleware("http")
async def observability_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id, route=request.url.path, method=request.method
    )

    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.exception(
            "request_failed",
            route=request.url.path,
            status=500,
            latency_ms=elapsed_ms,
        )
        user_id = getattr(request.state, "user_id", None)
        if settings.SENTRY_ENABLED and settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("request_id", request_id)
                scope.set_tag("route", request.url.path)
                if user_id:
                    scope.set_user({"id": user_id})
                sentry_sdk.capture_exception(exc)

        problem = _problem_details(
            request=request,
            status_code=500,
            title="Internal Server Error",
            detail="An unexpected error occurred.",
            request_id=request_id,
        )
        response = JSONResponse(
            status_code=500,
            content=problem,
            media_type="application/problem+json",
        )
        response.headers["X-Request-ID"] = request_id
        structlog.contextvars.clear_contextvars()
        return response

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_completed",
        route=request.url.path,
        status=response.status_code,
        latency_ms=elapsed_ms,
    )
    structlog.contextvars.clear_contextvars()
    return response


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    response = JSONResponse(
        status_code=429,
        media_type="application/problem+json",
        content=_problem_details(
            request=request,
            status_code=429,
            title="Too Many Requests",
            detail="Too many requests. Please retry after the cooldown period.",
            request_id=request_id,
        ),
    )
    retry_after = getattr(exc, "retry_after", None)
    response.headers["Retry-After"] = str(retry_after or 60)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    user_id = getattr(request.state, "user_id", None)

    if settings.SENTRY_ENABLED and settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("request_id", request_id)
            scope.set_tag("route", request.url.path)
            if user_id:
                scope.set_user({"id": user_id})
            sentry_sdk.capture_exception(exc)

    problem = _problem_details(
        request=request,
        status_code=500,
        title="Internal Server Error",
        detail="An unexpected error occurred.",
        request_id=request_id,
    )
    return JSONResponse(
        status_code=500,
        content=problem,
        media_type="application/problem+json",
    )
