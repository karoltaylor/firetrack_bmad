from app.core.observability import scrub_sentry_event


def test_scrub_sentry_event_redacts_sensitive_fields() -> None:
    event = {
        "extra": {
            "token": "secret-token",
            "nested": {"portfolio_value": 1234, "label": "safe"},
        },
        "request": {"data": {"password": "unsafe", "message": "ok"}},
    }

    scrubbed = scrub_sentry_event(event, {})

    assert scrubbed["extra"]["token"] == "[REDACTED]"
    assert scrubbed["extra"]["nested"]["portfolio_value"] == "[REDACTED]"
    assert scrubbed["extra"]["nested"]["label"] == "safe"
    assert scrubbed["request"]["data"]["password"] == "[REDACTED]"
    assert scrubbed["request"]["data"]["message"] == "ok"
