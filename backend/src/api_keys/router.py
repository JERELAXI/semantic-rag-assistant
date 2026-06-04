import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api_keys.schemas import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse
from src.api_keys.service import create_api_key, list_api_keys, revoke_api_key
from src.auth.models import User
from src.core.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.get("", response_model=list[ApiKeyResponse])
async def get_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_api_keys(db, current_user)


@router.post("", response_model=ApiKeyCreated, status_code=201)
async def post_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_api_key(db, current_user, body.name)


@router.delete("/{key_id}", status_code=204)
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await revoke_api_key(db, current_user, key_id)
