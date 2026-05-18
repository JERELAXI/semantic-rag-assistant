from httpx import AsyncClient


async def test_health_returns_200_and_healthy_status(async_client: AsyncClient) -> None:
    resp = await async_client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
