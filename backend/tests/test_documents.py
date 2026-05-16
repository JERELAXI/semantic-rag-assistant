import pytest
from httpx import AsyncClient

from src.core.config import settings

_TXT_FILE = ("test.txt", b"Hello, this is a test document.", "text/plain")


async def test_upload_txt_file_returns_201_with_uploading_status(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    resp = await async_client.post(
        "/documents/upload",
        files={"file": _TXT_FILE},
        data={"title": "Test Doc", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "uploading"
    assert "id" in data


async def test_get_document_status_returns_200(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    upload_resp = await async_client.post(
        "/documents/upload",
        files={"file": _TXT_FILE},
        data={"title": "Test Doc", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )
    doc_id = upload_resp.json()["id"]

    resp = await async_client.get(f"/documents/{doc_id}/status", headers=auth_headers)
    assert resp.status_code == 200
    assert "status" in resp.json()


async def test_list_documents_by_kb_returns_200_with_uploaded_doc(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    upload_resp = await async_client.post(
        "/documents/upload",
        files={"file": _TXT_FILE},
        data={"title": "Listed Doc", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )
    doc_id = upload_resp.json()["id"]

    resp = await async_client.get(f"/documents/kb/{created_kb}", headers=auth_headers)
    assert resp.status_code == 200
    ids = [doc["id"] for doc in resp.json()]
    assert doc_id in ids


async def test_delete_document_returns_204(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    upload_resp = await async_client.post(
        "/documents/upload",
        files={"file": ("delete_me.txt", b"Content to delete.", "text/plain")},
        data={"title": "To Delete", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )
    doc_id = upload_resp.json()["id"]

    resp = await async_client.delete(f"/documents/{doc_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_upload_duplicate_content_returns_409(
    async_client: AsyncClient, auth_headers: dict, created_kb: str
) -> None:
    content = b"Unique content that will be uploaded twice to trigger 409."
    upload_kwargs = dict(
        files={"file": ("doc.txt", content, "text/plain")},
        data={"title": "Original", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )

    first = await async_client.post("/documents/upload", **upload_kwargs)
    assert first.status_code == 201

    second = await async_client.post("/documents/upload", **upload_kwargs)
    assert second.status_code == 409


async def test_upload_oversized_file_returns_413(
    async_client: AsyncClient,
    auth_headers: dict,
    created_kb: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Force the size limit to 0 so any file is considered oversized
    monkeypatch.setattr(settings, "max_file_size_mb", 0)

    resp = await async_client.post(
        "/documents/upload",
        files={"file": ("oversized.txt", b"x", "text/plain")},
        data={"title": "Oversized", "knowledge_base_id": created_kb},
        headers=auth_headers,
    )
    assert resp.status_code == 413
