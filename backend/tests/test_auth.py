import uuid

from httpx import AsyncClient


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:8]}@test.com"


async def test_register_returns_201_with_tokens(async_client: AsyncClient) -> None:
    resp = await async_client.post(
        "/auth/register",
        json={"email": _unique_email(), "password": "password123", "display_name": "Alice"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_login_returns_200_with_tokens(async_client: AsyncClient) -> None:
    email = _unique_email()
    password = "password123"
    await async_client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": "Alice"},
    )
    resp = await async_client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_login_wrong_password_returns_401(
    async_client: AsyncClient, registered_user: dict
) -> None:
    resp = await async_client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "wrongpassword"},
    )
    assert resp.status_code == 401


async def test_me_with_token_returns_current_user(
    async_client: AsyncClient, registered_user: dict, auth_headers: dict
) -> None:
    resp = await async_client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["email"]


async def test_me_without_token_returns_401(async_client: AsyncClient) -> None:
    resp = await async_client.get("/auth/me")
    assert resp.status_code == 401


async def test_refresh_token_returns_new_tokens(
    async_client: AsyncClient, registered_user: dict
) -> None:
    resp = await async_client.post(
        "/auth/refresh",
        json={"refresh_token": registered_user["refresh_token"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_register_duplicate_email_returns_409(async_client: AsyncClient) -> None:
    email = _unique_email()
    payload = {"email": email, "password": "password123", "display_name": "Alice"}
    first = await async_client.post("/auth/register", json=payload)
    assert first.status_code == 201
    second = await async_client.post("/auth/register", json=payload)
    assert second.status_code == 409
