"""Chat routes: POST /search, CRUD sessions, POST /message (SSE stream)."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from src.auth.models import User
from src.chat.models import Message
from src.chat.rag_pipeline import RAGPipeline
from src.chat.retriever import HybridRetriever
from src.chat.schemas import (
    CitationResponse,
    MessageCreate,
    MessageResponse,
    SearchRequest,
    SearchResult,
    SessionCreate,
    SessionResponse,
)
from src.chat.service import (
    create_session,
    delete_session,
    get_session,
    get_session_with_messages,
    list_user_sessions,
)
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.knowledge_bases.service import check_kb_access

router = APIRouter(prefix="/chat", tags=["chat"])


def _to_message_response(message: Message) -> MessageResponse:
    citations = [
        CitationResponse(
            chunk_id=c.chunk_id,
            document_title=c.chunk.document.filename,
            content_excerpt=c.chunk.content[:200],
            relevance_score=c.score or 0.0,
        )
        for c in message.citations
    ]
    return MessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        created_at=message.created_at,
        citations=citations,
    )


# ── Search ──────────────────────────────────────────────────────────────────

@router.post("/search", response_model=list[SearchResult])
async def search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SearchResult]:
    await check_kb_access(db, body.knowledge_base_id, current_user)
    retriever = HybridRetriever(db)
    return await retriever.search(
        query=body.query,
        knowledge_base_id=body.knowledge_base_id,
        mode=body.mode,
        top_k=body.top_k,
    )


# ── Sessions ────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionResponse:
    session = await create_session(db, current_user, body.knowledge_base_id, body.title)
    return SessionResponse.model_validate(session)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SessionResponse]:
    sessions = await list_user_sessions(db, current_user)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    session = await get_session_with_messages(db, session_id, current_user)
    return [_to_message_response(m) for m in session.messages]


@router.delete("/sessions/{session_id}", status_code=204)
async def delete(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_session(db, session_id, current_user)


# ── Messages (SSE stream) ──────────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: uuid.UUID,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    await get_session(db, session_id, current_user)
    pipeline = RAGPipeline(db)
    return StreamingResponse(
        pipeline.stream_response(session_id, body.content),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
