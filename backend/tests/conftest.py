"""Shared fixtures for integration tests.

Prerequisites:
- A running PostgreSQL instance with the pgvector extension available.
- TEST_DATABASE_URL set in backend/.env (or as an environment variable), e.g.:
    TEST_DATABASE_URL=postgresql+asyncpg://user:pass@localhost/semantic_rag_test
- The test database must exist; tables are created and dropped automatically per test.
"""
from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import src.core.base  # noqa: F401 — registers all models with Base.metadata
from src.core.config import settings
from src.core.database import Base, get_db
from src.main import app


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    test_db_url = settings.test_database_url
    if test_db_url is None:
        pytest.skip("TEST_DATABASE_URL is not configured — skipping integration tests")

    engine = create_async_engine(test_db_url, echo=False)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    TestSession = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(autouse=True)
def _mock_process_document(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent background document processing (OpenAI calls, production DB) during tests."""
    async def _noop(document_id: uuid.UUID) -> None:
        pass

    monkeypatch.setattr("src.documents.router.process_document", _noop)


@pytest_asyncio.fixture
async def registered_user(async_client: AsyncClient) -> dict:
    email = f"user-{uuid.uuid4().hex[:8]}@test.com"
    password = "testpassword123"
    resp = await async_client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": "Test User"},
    )
    assert resp.status_code == 201
    return {"email": email, "password": password, **resp.json()}


@pytest_asyncio.fixture
async def auth_headers(registered_user: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest_asyncio.fixture
async def created_kb(async_client: AsyncClient, auth_headers: dict[str, str]) -> str:
    resp = await async_client.post(
        "/knowledge-bases",
        json={"name": "Test KB"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]
