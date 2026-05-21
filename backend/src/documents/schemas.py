"""Pydantic v2 schemas: DocumentUpload, DocumentResponse, DocumentStatus."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DocumentUpload(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    knowledge_base_id: uuid.UUID


class IngestUrlRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    title: str = Field(..., min_length=1, max_length=255)
    knowledge_base_id: uuid.UUID


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    content_type: str
    status: str
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class DocumentStatus(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    status: str
    chunk_count: int
    error: str | None = None
