"""Pydantic v2 schemas: SearchRequest, SearchResult, SessionCreate, MessageCreate, CitationResponse."""

import uuid
from typing import Literal

from pydantic import BaseModel, Field


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
