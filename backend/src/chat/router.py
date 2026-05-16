"""Chat routes: POST /search, CRUD sessions, POST /message, GET /stream (SSE)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.chat.retriever import HybridRetriever
from src.chat.schemas import SearchRequest, SearchResult
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.knowledge_bases.service import check_kb_access

router = APIRouter(prefix="/chat", tags=["chat"])


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
