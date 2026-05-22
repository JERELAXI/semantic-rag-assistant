"""Knowledge-base routes: CRUD + share management."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.knowledge_bases.models import KBShare, KnowledgeBase
from src.knowledge_bases.schemas import (
    KBCreate,
    KBInvitationResponse,
    KBResponse,
    KBShareCreate,
    KBShareResponse,
)
from src.knowledge_bases.service import (
    accept_invitation,
    check_kb_owner,
    create_knowledge_base,
    decline_invitation,
    delete_knowledge_base,
    get_kb_shares,
    get_kb_with_permission,
    get_pending_invitations,
    list_knowledge_bases,
    share_kb,
    unshare_kb,
)

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


def _build_kb_response(
    kb: KnowledgeBase,
    permission: Literal["owner", "editor", "viewer"],
    shared_by_name: str | None = None,
) -> KBResponse:
    return KBResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        owner_type=kb.owner_type,
        owner_id=kb.owner_id,
        created_at=kb.created_at,
        updated_at=kb.updated_at,
        permission=permission,
        shared_by_name=shared_by_name,
    )


def _build_share_response(share: KBShare) -> KBShareResponse:
    return KBShareResponse(
        id=share.id,
        shared_with_user_id=share.shared_with_user_id,
        shared_with_email=share.shared_with.email,
        shared_with_display_name=share.shared_with.display_name,
        permission=share.permission,  # type: ignore[arg-type]
        status=share.status,  # type: ignore[arg-type]
        created_at=share.created_at,
    )


# ── Invitations (registered before /{kb_id} to avoid path-param capture) ────

@router.get("/invitations", response_model=list[KBInvitationResponse])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KBInvitationResponse]:
    rows = await get_pending_invitations(db, current_user)
    return [
        KBInvitationResponse(
            share_id=share.id,
            kb_id=share.knowledge_base_id,
            kb_name=kb_name,
            owner_name=owner_name,
            permission=share.permission,  # type: ignore[arg-type]
            created_at=share.created_at,
        )
        for share, kb_name, owner_name in rows
    ]


@router.post("/invitations/{share_id}/accept", status_code=204)
async def accept(
    share_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await accept_invitation(db, share_id, current_user)


@router.post("/invitations/{share_id}/decline", status_code=204)
async def decline(
    share_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await decline_invitation(db, share_id, current_user)


# ── KB CRUD ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[KBResponse])
async def list_kbs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KBResponse]:
    items = await list_knowledge_bases(db, current_user)
    return [_build_kb_response(kb, perm, shared_by) for kb, perm, shared_by in items]


@router.post("", response_model=KBResponse, status_code=201)
async def create(
    body: KBCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KBResponse:
    kb = await create_knowledge_base(
        db, current_user, body.name, body.description, body.owner_type, body.owner_id
    )
    return _build_kb_response(kb, "owner")


@router.get("/{kb_id}", response_model=KBResponse)
async def get(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KBResponse:
    kb, permission, shared_by_name = await get_kb_with_permission(db, kb_id, current_user)
    return _build_kb_response(kb, permission, shared_by_name)


@router.delete("/{kb_id}", status_code=204)
async def delete(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_knowledge_base(db, kb_id, current_user)


# ── Share management ─────────────────────────────────────────────────────────

@router.post("/{kb_id}/share", response_model=KBShareResponse, status_code=201)
async def share(
    kb_id: uuid.UUID,
    body: KBShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KBShareResponse:
    kb_share = await share_kb(db, kb_id, current_user, body.email, body.permission)
    return _build_share_response(kb_share)


@router.get("/{kb_id}/shares", response_model=list[KBShareResponse])
async def list_shares(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KBShareResponse]:
    shares = await get_kb_shares(db, kb_id, current_user)
    return [_build_share_response(s) for s in shares]


@router.delete("/{kb_id}/shares/{user_id}", status_code=204)
async def remove_share(
    kb_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await unshare_kb(db, kb_id, current_user, user_id)
