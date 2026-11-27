"""API tests for healthcheck, JWKS public key endpoint, and authentication."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_and_jwks(client: TestClient) -> None:
    """Verify /health and /.well-known/jwks.json return valid public metadata."""
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    jwks = client.get("/.well-known/jwks.json")
    assert jwks.status_code == 200
    keys = jwks.json()["keys"]
    assert len(keys) == 1
    assert keys[0]["kty"] == "RSA"
    assert keys[0]["alg"] == "RS256"
    assert keys[0]["use"] == "sig"
    assert "kid" in keys[0] and "n" in keys[0] and "e" in keys[0]


def test_demo_login_register_and_auth_guards(client: TestClient) -> None:
    """Verify seeded demo login, registration, duplicate conflict, invalid login, and 401 guards."""
    # Seeded demo user can log in
    demo_login = client.post(
        "/auth/login", data={"username": "demo", "password": "demo1234"}
    )
    assert demo_login.status_code == 200
    assert demo_login.json()["user"]["username"] == "demo"

    # Bad password returns 401
    bad_login = client.post(
        "/auth/login", data={"username": "demo", "password": "wrongpassword"}
    )
    assert bad_login.status_code == 401

    # Unknown user returns 401
    unknown_login = client.post(
        "/auth/login", data={"username": "ghost_user", "password": "password123"}
    )
    assert unknown_login.status_code == 401

    # Duplicate register returns 409
    dup_reg = client.post(
        "/auth/register", json={"username": "demo", "password": "password123"}
    )
    assert dup_reg.status_code == 409

    # Protected endpoints reject unauthenticated callers
    assert client.get("/analyses").status_code == 401
    assert client.post("/analyses/sample").status_code == 401
