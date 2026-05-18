"""MCP resources: knowledge://stats/{knowledge_base_id}, knowledge://documents/{document_id}."""

import json
import uuid

from sqlalchemy import func, select

from src.core.database import AsyncSessionLocal
from src.documents.models import Chunk, Document, Embedding
from src.mcp_server.server import mcp


@mcp.resource("knowledge://stats/{knowledge_base_id}")
async def kb_stats(knowledge_base_id: str) -> str:
    """Returns total document, chunk, and embedding counts for a knowledge base."""
    kb_id = uuid.UUID(knowledge_base_id)
    async with AsyncSessionLocal() as db:
        doc_count = (await db.execute(
            select(func.count()).select_from(Document)
            .where(Document.knowledge_base_id == kb_id)
        )).scalar_one()

        chunk_count = (await db.execute(
            select(func.count()).select_from(Chunk)
            .join(Document, Chunk.document_id == Document.id)
            .where(Document.knowledge_base_id == kb_id)
        )).scalar_one()

        embedding_count = (await db.execute(
            select(func.count()).select_from(Embedding)
            .join(Chunk, Embedding.chunk_id == Chunk.id)
            .join(Document, Chunk.document_id == Document.id)
            .where(Document.knowledge_base_id == kb_id)
        )).scalar_one()

    return json.dumps({
        "knowledge_base_id": knowledge_base_id,
        "document_count": doc_count,
        "chunk_count": chunk_count,
        "embedding_count": embedding_count,
    })


@mcp.resource("knowledge://documents/{document_id}")
async def document_resource(document_id: str) -> str:
    """Returns document metadata, processing status, and chunk count."""
    doc_id = uuid.UUID(document_id)
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if doc is None:
            raise ValueError(f"Document {document_id} not found")

        chunk_count = (await db.execute(
            select(func.count()).select_from(Chunk)
            .where(Chunk.document_id == doc_id)
        )).scalar_one()

    return json.dumps({
        "id": str(doc.id),
        "filename": doc.filename,
        "content_type": doc.content_type,
        "file_size": doc.file_size,
        "status": doc.status,
        "created_at": doc.created_at.isoformat(),
        "knowledge_base_id": str(doc.knowledge_base_id),
        "chunk_count": chunk_count,
    })
