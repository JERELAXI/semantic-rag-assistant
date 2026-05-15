"""Pydantic v2 schemas: RegisterRequest, LoginRequest, TokenResponse, UserResponse."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}
