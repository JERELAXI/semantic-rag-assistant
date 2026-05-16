"""Pydantic v2 schemas: KBCreate, KBResponse."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class KBCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    owner_type: Literal["user", "organization"] = "user"
    # Required only when owner_type == "organization"; ignored for "user" (always set to current user)
    owner_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def owner_id_required_for_org(self) -> "KBCreate":
        if self.owner_type == "organization" and self.owner_id is None:
            raise ValueError("owner_id is required when owner_type is 'organization'")
        return self


class KBResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    owner_type: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
