"""Knowledge-base routes: GET /, POST /, GET /{id}, DELETE /{id}."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.knowledge_bases.schemas import KBCreate, KBResponse
from src.knowledge_bases.service import (
    create_knowledge_base,
    delete_knowledge_base,
    get_knowledge_base,
    list_knowledge_bases,
)

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.get("", response_model=list[KBResponse])
async def list_kbs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KBResponse]:
    kbs = await list_knowledge_bases(db, current_user)
    return [KBResponse.model_validate(kb) for kb in kbs]


@router.post("", response_model=KBResponse, status_code=201)
async def create(
    body: KBCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KBResponse:
    kb = await create_knowledge_base(
        db, current_user, body.name, body.description, body.owner_type, body.owner_id
    )
    return KBResponse.model_validate(kb)


@router.get("/{kb_id}", response_model=KBResponse)
async def get(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KBResponse:
    kb = await get_knowledge_base(db, kb_id, current_user)
    return KBResponse.model_validate(kb)


@router.delete("/{kb_id}", status_code=204)
async def delete(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_knowledge_base(db, kb_id, current_user)
