import re
from typing import Any

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app import crud
from app.api.deps import SessionDep
from app.core.rate_limit import limiter
from app.models import UserCreate

router = APIRouter(tags=["auth"])

PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 12 characters and include upper, lower, number, and symbol."
)
DUPLICATE_EMAIL_MESSAGE = "Unable to complete registration with provided credentials."


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
    request_id = getattr(request.state, "request_id", None)
    email_input = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    try:
        normalized_email = validate_email(
            email_input, check_deliverability=False
        ).normalized
    except EmailNotValidError:
        response = _validation_problem(
            field="email", detail="Enter a valid email address in name@example.com format."
        )
        if request_id:
            response.headers["X-Request-ID"] = request_id
        return response

    if not _is_strong_password(password):
        response = _validation_problem(field="password", detail=PASSWORD_POLICY_MESSAGE)
        if request_id:
            response.headers["X-Request-ID"] = request_id
        return response

    existing_user = crud.get_user_by_email(session=session, email=normalized_email)
    if existing_user:
        response = JSONResponse(
            status_code=409,
            media_type="application/problem+json",
            content={
                "type": "about:blank",
                "title": "Conflict",
                "status": 409,
                "detail": DUPLICATE_EMAIL_MESSAGE,
            },
        )
        if request_id:
            response.headers["X-Request-ID"] = request_id
        return response

    user = crud.create_user(
        session=session,
        user_create=UserCreate(email=normalized_email, password=password),
    )
    return {"data": {"user_id": str(user.id)}}
