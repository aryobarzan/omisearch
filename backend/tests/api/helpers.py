"""Shared CSV payloads and auth helpers for API integration tests."""

from __future__ import annotations

from textwrap import dedent

from fastapi.testclient import TestClient

VALID_EXPR_CSV = dedent(
    """\
    gene,C1,C2,C3,C4,T1,T2,T3,T4
    UP_1,5.0,5.2,4.8,5.1,8.0,8.2,7.9,8.1
    DOWN_1,9.0,8.8,9.2,8.9,5.0,4.8,5.2,5.1
    NULL_1,6.0,6.5,5.5,6.1,6.1,5.9,6.3,5.8
    """
)

VALID_ANN_CSV = dedent(
    """\
    sample,group
    C1,control
    C2,control
    C3,control
    C4,control
    T1,treated
    T2,treated
    T3,treated
    T4,treated
    """
)

VALID_INTERACTIONS_CSV = dedent(
    """\
    gene_a,gene_b,score
    UP_1,DOWN_1,0.88
    UP_1,NULL_1,0.95
    """
)


def auth_header(token: str) -> dict[str, str]:
    """Build a Bearer Authorization header dict for TestClient requests."""
    return {"Authorization": f"Bearer {token}"}


def register_and_get_headers(
    client: TestClient, username: str, password: str = "password123"
) -> dict[str, str]:
    """Register a user via POST /auth/register and return their Authorization header."""
    res = client.post(
        "/auth/register", json={"username": username, "password": password}
    )
    assert res.status_code == 201, res.text
    return auth_header(res.json()["access_token"])
