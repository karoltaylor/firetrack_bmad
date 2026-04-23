import ipaddress

from fastapi import Request
from slowapi import Limiter

from app.core.config import settings


def _trusted_proxy_hosts() -> set[str]:
    configured_hosts = {
        host.strip()
        for host in settings.TRUSTED_PROXY_IPS.split(",")
        if host.strip()
    }
    # TestClient uses "testclient" as remote host; trust only in local env.
    if settings.ENVIRONMENT == "local":
        configured_hosts.add("testclient")
    return configured_hosts


def _is_private_network_host(host: str) -> bool:
    try:
        parsed = ipaddress.ip_address(host)
    except ValueError:
        return False
    return parsed.is_private or parsed.is_loopback


def _normalize_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def forwarded_ip_key(request: Request) -> str:
    client_host = request.client.host if request.client and request.client.host else None
    if client_host and (
        client_host in _trusted_proxy_hosts() or _is_private_network_host(client_host)
    ):
        real_ip = request.headers.get("x-real-ip")
        normalized_real_ip = _normalize_ip(real_ip)
        if normalized_real_ip:
            return normalized_real_ip

        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            forwarded_chain = [
                _normalize_ip(ip) for ip in forwarded_for.split(",") if ip.strip()
            ]
            forwarded_chain = [ip for ip in forwarded_chain if ip]
            if forwarded_chain:
                # Use the right-most hop to avoid trusting attacker-prepended values.
                return str(forwarded_chain[-1])

    if client_host:
        return client_host

    return "unknown"


limiter = Limiter(key_func=forwarded_ip_key, default_limits=[])
