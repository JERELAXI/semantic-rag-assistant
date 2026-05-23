"""Document business logic: upload file to disk, persist metadata, trigger background processing."""

import hashlib
import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User
from src.core.config import settings
from src.core.exceptions import ConflictError, NotFoundError
from src.documents.models import Chunk, Document
from src.knowledge_bases.service import check_kb_access, check_kb_write_access

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
}

# Magic bytes used to verify actual file content matches declared MIME type.
# text/plain and text/markdown have no fixed magic bytes so they are omitted.
_MAGIC_BYTES: dict[str, bytes] = {
    "application/pdf": b"%PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
}


def _verify_magic_bytes(content_type: str, data: bytes) -> bool:
    magic = _MAGIC_BYTES.get(content_type)
    if magic is None:
        return True
    return data[: len(magic)] == magic


async def ingest_document_bytes(
    db: AsyncSession,
    user: User,
    knowledge_base_id: uuid.UUID,
    title: str,
    content_type: str,
    data: bytes,
    filename: str | None = None,
) -> Document:
    await check_kb_write_access(db, knowledge_base_id, user)

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported file type: {content_type}. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}")

    if not _verify_magic_bytes(content_type, data):
        raise ValueError(f"File content does not match declared type: {content_type}")

    content_hash = hashlib.sha256(data).hexdigest()
    existing = await db.execute(
        select(Document.id).where(
            Document.knowledge_base_id == knowledge_base_id,
            Document.content_hash == content_hash,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("A document with identical content already exists in this knowledge base")

    doc_id = uuid.uuid4()
    doc_dir = UPLOAD_DIR / str(doc_id)
    os.makedirs(doc_dir, exist_ok=True)

    # Use only the basename to prevent path traversal (e.g. ../../etc/passwd → passwd).
    raw_name = filename or f"upload{ALLOWED_CONTENT_TYPES[content_type]}"
    safe_filename = Path(raw_name).name or f"upload{ALLOWED_CONTENT_TYPES[content_type]}"
    file_path = doc_dir / safe_filename
    file_path.write_bytes(data)

    document = Document(
        id=doc_id,
        knowledge_base_id=knowledge_base_id,
        filename=title,
        file_path=str(file_path),
        content_type=content_type,
        file_size=len(data),
        content_hash=content_hash,
        status="uploading",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


async def upload_document(
    db: AsyncSession,
    user: User,
    knowledge_base_id: uuid.UUID,
    title: str,
    file: UploadFile,
) -> Document:
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )
    data = await file.read()
    filename = file.filename or f"upload{ALLOWED_CONTENT_TYPES[content_type]}"
    return await ingest_document_bytes(db, user, knowledge_base_id, title, content_type, data, filename)


async def get_document(db: AsyncSession, document_id: uuid.UUID, user: User) -> Document:
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.knowledge_base))
        .where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise NotFoundError("Document not found")

    await check_kb_access(db, document.knowledge_base_id, user)
    return document


async def list_documents(db: AsyncSession, knowledge_base_id: uuid.UUID, user: User) -> list[Document]:
    await check_kb_access(db, knowledge_base_id, user)

    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == knowledge_base_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_document(db: AsyncSession, document_id: uuid.UUID, user: User) -> None:
    document = await get_document(db, document_id, user)
    await check_kb_write_access(db, document.knowledge_base_id, user)

    file_path = Path(document.file_path)
    if file_path.exists():
        file_path.unlink()
        parent = file_path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    await db.delete(document)
    await db.commit()


async def get_chunk_count(db: AsyncSession, document_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(Chunk).where(Chunk.document_id == document_id)
    )
    return result.scalar_one()
