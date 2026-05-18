import uuid

from httpx import AsyncClient


async def _register_user(client: AsyncClient) -> dict:
    """Register a fresh user and return tokens + email."""
    email = f"user-{uuid.uuid4().hex[:8]}@test.com"
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "display_name": "User"},
    )
    assert resp.status_code == 201
    return {"email": email, **resp.json()}


async def _get_user_id(client: AsyncClient, access_token: str) -> str:
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert resp.status_code == 200
    return resp.json()["id"]


async def test_create_org_returns_201(async_client: AsyncClient, auth_headers: dict) -> None:
    resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Acme Corp"
    assert "id" in data


async def test_get_org_returns_200(async_client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    org_id = create_resp.json()["id"]

    resp = await async_client.get(f"/organizations/{org_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == org_id


async def test_invite_member_returns_201(async_client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    org_id = create_resp.json()["id"]

    second = await _register_user(async_client)
    second_user_id = await _get_user_id(async_client, second["access_token"])

    resp = await async_client.post(
        f"/organizations/{org_id}/invite",
        json={"user_id": second_user_id, "role": "member"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["user_id"] == second_user_id


async def test_remove_member_returns_204(async_client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    org_id = create_resp.json()["id"]

    second = await _register_user(async_client)
    second_user_id = await _get_user_id(async_client, second["access_token"])

    await async_client.post(
        f"/organizations/{org_id}/invite",
        json={"user_id": second_user_id, "role": "member"},
        headers=auth_headers,
    )

    resp = await async_client.delete(
        f"/organizations/{org_id}/members/{second_user_id}", headers=auth_headers
    )
    assert resp.status_code == 204


async def test_delete_org_returns_204(async_client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    org_id = create_resp.json()["id"]

    resp = await async_client.delete(f"/organizations/{org_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_org_as_non_owner_returns_403(
    async_client: AsyncClient, auth_headers: dict
) -> None:
    # Owner creates org
    create_resp = await async_client.post(
        "/organizations", json={"name": "Acme Corp"}, headers=auth_headers
    )
    org_id = create_resp.json()["id"]

    # Register second user and invite them as a member (not owner)
    second = await _register_user(async_client)
    second_user_id = await _get_user_id(async_client, second["access_token"])
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}

    await async_client.post(
        f"/organizations/{org_id}/invite",
        json={"user_id": second_user_id, "role": "member"},
        headers=auth_headers,
    )

    # Non-owner member tries to delete the org
    resp = await async_client.delete(f"/organizations/{org_id}", headers=second_headers)
    assert resp.status_code == 403
