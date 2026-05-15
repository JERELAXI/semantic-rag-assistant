"""Document routes: POST /upload, GET /kb/{kb_id}, GET /{id}/status, GET /{id}, DELETE /{id}."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.documents.processing import process_document
from src.documents.schemas import DocumentResponse, DocumentStatus
from src.documents.service import delete_document, get_chunk_count, get_document, list_documents, upload_document

router = APIRouter(prefix="/documents", tags=["documents"])


async def _to_response(db: AsyncSession, doc) -> DocumentResponse:
    count = await get_chunk_count(db, doc.id)
    return DocumentResponse(
        id=doc.id,
        title=doc.filename,
        content_type=doc.content_type,
        status=doc.status,
        chunk_count=count,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload(
    file: UploadFile,
    title: str = Form(...),
    knowledge_base_id: uuid.UUID = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    document = await upload_document(db, current_user, knowledge_base_id, title, file)
    background_tasks.add_task(process_document, document.id)
    return await _to_response(db, document)


@router.get("/kb/{knowledge_base_id}", response_model=list[DocumentResponse])
async def list_by_kb(
    knowledge_base_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    docs = await list_documents(db, knowledge_base_id, current_user)
    return [await _to_response(db, doc) for doc in docs]


@router.get("/{document_id}/status", response_model=DocumentStatus)
async def status(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentStatus:
    doc = await get_document(db, document_id, current_user)
    count = await get_chunk_count(db, doc.id)
    return DocumentStatus(
        id=doc.id,
        status=doc.status,
        chunk_count=count,
        error=doc.error_message,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_by_id(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    doc = await get_document(db, document_id, current_user)
    return await _to_response(db, doc)


@router.delete("/{document_id}", status_code=204)
async def delete(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_document(db, document_id, current_user)
