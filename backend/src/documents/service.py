"""Document business logic: upload file to disk, persist metadata, trigger background processing."""

import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User
from src.core.config import settings
from src.core.exceptions import NotFoundError
from src.documents.models import Chunk, Document
from src.knowledge_bases.models import KnowledgeBase
from src.organizations.models import OrganizationMember

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
}


async def _check_kb_access(db: AsyncSession, knowledge_base_id: uuid.UUID, user: User) -> KnowledgeBase:
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id)
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise NotFoundError("Knowledge base not found")

    if kb.owner_type == "user" and kb.owner_id == user.id:
        return kb

    if kb.owner_type == "organization":
        member = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == kb.owner_id,
                OrganizationMember.user_id == user.id,
            )
        )
        if member.scalar_one_or_none() is not None:
            return kb

    raise NotFoundError("Knowledge base not found")


async def upload_document(
    db: AsyncSession,
    user: User,
    knowledge_base_id: uuid.UUID,
    title: str,
    file: UploadFile,
) -> Document:
    await _check_kb_access(db, knowledge_base_id, user)

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    doc_id = uuid.uuid4()
    doc_dir = UPLOAD_DIR / str(doc_id)
    os.makedirs(doc_dir, exist_ok=True)

    filename = file.filename or f"upload{ALLOWED_CONTENT_TYPES[content_type]}"
    file_path = doc_dir / filename

    data = await file.read()
    file_path.write_bytes(data)

    document = Document(
        id=doc_id,
        knowledge_base_id=knowledge_base_id,
        filename=title,
        file_path=str(file_path),
        content_type=content_type,
        file_size=len(data),
        status="uploading",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


async def get_document(db: AsyncSession, document_id: uuid.UUID, user: User) -> Document:
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.knowledge_base))
        .where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise NotFoundError("Document not found")

    await _check_kb_access(db, document.knowledge_base_id, user)
    return document


async def list_documents(db: AsyncSession, knowledge_base_id: uuid.UUID, user: User) -> list[Document]:
    await _check_kb_access(db, knowledge_base_id, user)

    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == knowledge_base_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_document(db: AsyncSession, document_id: uuid.UUID, user: User) -> None:
    document = await get_document(db, document_id, user)

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
