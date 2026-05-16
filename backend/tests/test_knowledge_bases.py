from httpx import AsyncClient


async def test_create_kb_returns_201(async_client: AsyncClient, auth_headers: dict) -> None:
    resp = await async_client.post(
        "/knowledge-bases", json={"name": "My KB"}, headers=auth_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My KB"
    assert "id" in data


async def test_list_kbs_contains_created(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    resp = await async_client.get("/knowledge-bases", headers=auth_headers)
    assert resp.status_code == 200
    ids = [kb["id"] for kb in resp.json()]
    assert created_kb in ids


async def test_get_kb_returns_200(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    resp = await async_client.get(f"/knowledge-bases/{created_kb}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == created_kb


async def test_delete_kb_returns_204(async_client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await async_client.post(
        "/knowledge-bases", json={"name": "To Delete"}, headers=auth_headers
    )
    kb_id = create_resp.json()["id"]

    resp = await async_client.delete(f"/knowledge-bases/{kb_id}", headers=auth_headers)
    assert resp.status_code == 204
