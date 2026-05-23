"""Pydantic v2 schemas: KBCreate, KBResponse, KBShareCreate, KBShareResponse."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


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
    # Caller's access level: "owner" for KB owner/org-member, "editor"/"viewer" for share recipients
    permission: Literal["owner", "editor", "viewer"] = "owner"
    # Display name of the KB owner, populated only when permission != "owner"
    shared_by_name: str | None = None


class KBShareCreate(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    permission: Literal["viewer", "editor"] = "viewer"


class KBShareResponse(BaseModel):
    id: uuid.UUID
    shared_with_user_id: uuid.UUID
    shared_with_email: str
    shared_with_display_name: str
    permission: Literal["viewer", "editor"]
    status: Literal["pending", "accepted"]
    created_at: datetime


class KBInvitationResponse(BaseModel):
    share_id: uuid.UUID
    kb_id: uuid.UUID
    kb_name: str
    owner_name: str
    permission: Literal["viewer", "editor"]
    created_at: datetime
