"""Pydantic v2 schemas: OrgCreate, OrgResponse, MemberInvite, MemberResponse."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class OrgCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class MemberInvite(BaseModel):
    user_id: uuid.UUID
    role: str = Field("member", pattern="^(owner|admin|member)$")


class MemberResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime


class OrgResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime
    members: list[MemberResponse]
