"""Pydantic v2 schemas for the chat module."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Search ──────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    knowledge_base_id: uuid.UUID
    mode: Literal["vector", "fts", "hybrid"] = "hybrid"
    top_k: int = Field(5, ge=1, le=50)


class SearchResult(BaseModel):
    chunk_id: uuid.UUID
    content: str
    score: float
    document_id: uuid.UUID
    document_title: str
    metadata: dict


# ── Sessions ────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    knowledge_base_id: uuid.UUID
    title: str | None = Field(None, max_length=500)


class SessionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str | None
    knowledge_base_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Messages & Citations ───────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class CitationResponse(BaseModel):
    chunk_id: uuid.UUID
    document_title: str
    content_excerpt: str
    relevance_score: float


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime
    citations: list[CitationResponse] = []
