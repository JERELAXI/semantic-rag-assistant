"""MCP tools: list_knowledge_bases, search_knowledge_base, get_chunk_by_id, ingest_document."""

import asyncio
import uuid
from pathlib import PurePosixPath

import httpx
from sqlalchemy import select

from src.api_keys.service import verify_api_key
from src.chat.retriever import HybridRetriever
from src.core.database import AsyncSessionLocal
from src.core.exceptions import AuthError
from src.documents.models import Chunk, Document
from src.documents.processing import process_document
from src.documents.service import ALLOWED_CONTENT_TYPES, ingest_document_bytes
from src.knowledge_bases.service import check_kb_access, list_knowledge_bases as svc_list_kbs
from src.mcp_server.server import mcp

_URL_CONTENT_TYPES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


async def _get_user(api_key: str, db):
    try:
        return await verify_api_key(db, api_key)
    except AuthError as e:
        raise ValueError(f"Authentication failed: {e}") from e


@mcp.tool()
async def list_knowledge_bases(api_key: str) -> list[dict]:
    """List all knowledge bases accessible to the authenticated user.

    Returns id, name, description, and permission role for each KB.
    Use the returned 'id' values as knowledge_base_id in other tools.
    """
    async with AsyncSessionLocal() as db:
        user = await _get_user(api_key, db)
        rows = await svc_list_kbs(db, user)
    return [
        {
            "id": str(kb.id),
            "name": kb.name,
            "description": kb.description,
            "permission": role,
            "shared_by": shared_by,
        }
        for kb, role, shared_by in rows
    ]


@mcp.tool()
async def search_knowledge_base(
    query: str,
    knowledge_base_id: str,
    api_key: str,
    mode: str = "hybrid",
    top_k: int = 5,
) -> list[dict]:
    """Search a knowledge base using vector, FTS, or hybrid retrieval.

    mode: "hybrid" (default), "vector", or "fts".
    Returns a list of matching chunks with content, score, and document context.
    """
    kb_id = uuid.UUID(knowledge_base_id)
    async with AsyncSessionLocal() as db:
        user = await _get_user(api_key, db)
        await check_kb_access(db, kb_id, user)
        retriever = HybridRetriever(db)
        results = await retriever.search(query, kb_id, mode=mode, top_k=top_k)
    return [
        {
            "chunk_id": str(r.chunk_id),
            "content": r.content,
            "score": r.score,
            "document_id": str(r.document_id),
            "document_title": r.document_title,
            "metadata": r.metadata,
        }
        for r in results
    ]


@mcp.tool()
async def get_chunk_by_id(chunk_id: str, api_key: str) -> dict:
    """Retrieve full chunk content with document context and metadata by chunk UUID."""
    cid = uuid.UUID(chunk_id)
    async with AsyncSessionLocal() as db:
        user = await _get_user(api_key, db)
        result = await db.execute(
            select(Chunk, Document)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.id == cid)
        )
        row = result.one_or_none()
        if row is None:
            raise ValueError(f"Chunk {chunk_id} not found")
        chunk, doc = row
        await check_kb_access(db, doc.knowledge_base_id, user)
    return {
        "chunk_id": str(chunk.id),
        "content": chunk.content,
        "chunk_index": chunk.chunk_index,
        "metadata": chunk.chunk_metadata,
        "document_id": str(doc.id),
        "document_title": doc.filename,
        "knowledge_base_id": str(doc.knowledge_base_id),
    }


@mcp.tool()
async def ingest_document(
    knowledge_base_id: str,
    title: str,
    api_key: str,
    text_content: str | None = None,
    file_url: str | None = None,
) -> dict:
    """Ingest a document into a knowledge base and trigger background processing.

    Provide exactly one of: text_content (raw UTF-8 text) or file_url (PDF/DOCX/TXT/MD).
    Returns document_id and initial status "uploading".
    """
    if not text_content and not file_url:
        raise ValueError("Either text_content or file_url must be provided")

    if text_content:
        data = text_content.encode("utf-8")
        content_type = "text/plain"
        filename = f"{title}.txt"
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(file_url)
            response.raise_for_status()
        data = response.content
        ct_header = response.headers.get("content-type", "").split(";")[0].strip()
        ext = PurePosixPath(file_url.split("?")[0]).suffix.lower()
        content_type = ct_header if ct_header in ALLOWED_CONTENT_TYPES else _URL_CONTENT_TYPES.get(ext, "")
        if not content_type:
            raise ValueError(
                f"Cannot determine a supported content type from URL {file_url!r}. "
                f"Supported types: {', '.join(ALLOWED_CONTENT_TYPES)}"
            )
        filename = PurePosixPath(file_url.split("?")[0]).name or f"{title}{ext}"

    kb_id = uuid.UUID(knowledge_base_id)

    async with AsyncSessionLocal() as db:
        user = await _get_user(api_key, db)
        document = await ingest_document_bytes(
            db, user, kb_id, title, content_type, data, filename
        )
        doc_id = document.id

    asyncio.create_task(process_document(doc_id))

    return {"document_id": str(doc_id), "status": "uploading"}
