import re
from datetime import timedelta
from typing import Any

import jwt
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.auth_sessions import (
    SessionStoreUnavailable,
    create_refresh_session,
    revoke_all_user_sessions,
    rotate_refresh_session,
)
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models import (
    AuthLoginRequest,
    AuthRefreshRequest,
    AuthTokenPair,
    Message,
    RefreshTokenPayload,
    User,
    UserCreate,
)

router = APIRouter(tags=["auth"])

PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 12 characters and include upper, lower, number, and symbol."
)
DUPLICATE_EMAIL_MESSAGE = "Unable to complete registration with provided credentials."
INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."
INVALID_REFRESH_MESSAGE = "Invalid or expired refresh token."
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30


def _validation_problem(*, field: str, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Validation Error",
            "status": 422,
            "detail": detail,
            "field": field,
        },
    )


def _auth_problem(*, title: str, detail: str, status_code: int = 401) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title,
            "status": status_code,
            "detail": detail,
        },
    )


def _with_request_id(response: JSONResponse, request: Request) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        response.headers["X-Request-ID"] = request_id
    return response


def _is_strong_password(password: str) -> bool:
    return (
        len(password) >= 12
        and re.search(r"[a-z]", password) is not None
        and re.search(r"[A-Z]", password) is not None
        and re.search(r"\d", password) is not None
        and re.search(r"[^A-Za-z0-9]", password) is not None
    )


@router.post("/auth/register", status_code=201)
@limiter.limit("5/minute")
def register_user(request: Request, session: SessionDep, payload: dict[str, Any]) -> Any:
    email_input = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    try:
        normalized_email = validate_email(
            email_input, check_deliverability=False
        ).normalized
    except EmailNotValidError:
        return _with_request_id(
            _validation_problem(
                field="email",
                detail="Enter a valid email address in name@example.com format.",
            ),
            request,
        )

    if not _is_strong_password(password):
        return _with_request_id(
            _validation_problem(field="password", detail=PASSWORD_POLICY_MESSAGE), request
        )

    existing_user = crud.get_user_by_email(session=session, email=normalized_email)
    if existing_user:
        return _with_request_id(
            _auth_problem(
                status_code=409,
                title="Conflict",
                detail=DUPLICATE_EMAIL_MESSAGE,
            ),
            request,
        )

    user = crud.create_user(
        session=session,
        user_create=UserCreate(email=normalized_email, password=password),
    )
    return {"data": {"user_id": str(user.id)}}


def _decode_refresh_token(token: str) -> RefreshTokenPayload | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_payload = RefreshTokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        return None
    if token_payload.typ != "refresh":
        return None
    return token_payload


def _issue_token_pair(user: User, *, session_id: str, nonce: str) -> AuthTokenPair:
    access_token = security.create_access_token(
        str(user.id), timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = security.create_refresh_token(
        str(user.id),
        session_id=session_id,
        nonce=nonce,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return AuthTokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/login", response_model=AuthTokenPair)
@limiter.limit("10/minute")
def login_user(request: Request, session: SessionDep, payload: AuthLoginRequest) -> Any:
    user = crud.authenticate(
        session=session, email=str(payload.email), password=payload.password
    )
    if not user or not user.is_active:
        return _with_request_id(
            _auth_problem(title="Unauthorized", detail=INVALID_CREDENTIALS_MESSAGE),
            request,
        )

    try:
        session_id, nonce = create_refresh_session(str(user.id))
    except SessionStoreUnavailable:
        return _with_request_id(
            _auth_problem(
                status_code=503,
                title="Service Unavailable",
                detail="Authentication session service is unavailable.",
            ),
            request,
        )
    return _issue_token_pair(user, session_id=session_id, nonce=nonce)


@router.post("/auth/refresh", response_model=AuthTokenPair)
@limiter.limit("15/minute")
def refresh_access_token(
    request: Request, session: SessionDep, payload: AuthRefreshRequest
) -> Any:
    refresh_payload = _decode_refresh_token(payload.refresh_token)
    if not refresh_payload:
        return _with_request_id(
            _auth_problem(title="Unauthorized", detail=INVALID_REFRESH_MESSAGE), request
        )

    user = session.get(User, refresh_payload.sub)
    if not user or not user.is_active:
        return _with_request_id(
            _auth_problem(title="Unauthorized", detail=INVALID_REFRESH_MESSAGE), request
        )

    try:
        rotated, new_nonce = rotate_refresh_session(
            user_id=str(user.id),
            session_id=refresh_payload.sid,
            nonce=refresh_payload.nonce,
            max_inactive=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
    except SessionStoreUnavailable:
        return _with_request_id(
            _auth_problem(
                status_code=503,
                title="Service Unavailable",
                detail="Authentication session service is unavailable.",
            ),
            request,
        )
    if not rotated or not new_nonce:
        return _with_request_id(
            _auth_problem(title="Unauthorized", detail=INVALID_REFRESH_MESSAGE), request
        )

    return _issue_token_pair(user, session_id=refresh_payload.sid, nonce=new_nonce)


@router.post("/auth/sessions/invalidate-all", response_model=Message)
def invalidate_all_sessions(request: Request, current_user: CurrentUser) -> Any:
    try:
        revoke_all_user_sessions(str(current_user.id))
    except SessionStoreUnavailable:
        return _with_request_id(
            _auth_problem(
                status_code=503,
                title="Service Unavailable",
                detail="Authentication session service is unavailable.",
            ),
            request,
        )
    return Message(message="All sessions invalidated.")
