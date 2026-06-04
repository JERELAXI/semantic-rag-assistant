import uuid
from datetime import datetime

from pydantic import BaseModel


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: datetime | None
    revoked: bool

    model_config = {"from_attributes": True}


class ApiKeyCreated(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    key: str  # full key — shown only once
    created_at: datetime
