from app.tasks.celery_app import celery, ping


def test_ping_task_returns_pong() -> None:
    # Calling the task directly bypasses the broker; safe for unit tests.
    assert ping() == "pong"


def test_celery_app_is_configured() -> None:
    assert celery.main == "firetrack"
    assert celery.conf.task_serializer == "json"
    assert celery.conf.broker_connection_retry_on_startup is True
    assert celery.conf.worker_prefetch_multiplier == 1
    assert celery.conf.task_acks_late is True
