from celery import Celery

from app.core.config import settings

celery = Celery(
    "firetrack",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery.task
def ping() -> str:
    return "pong"
