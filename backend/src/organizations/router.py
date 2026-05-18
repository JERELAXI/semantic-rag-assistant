"""Organization routes: POST /, GET /{id}, DELETE /{id}, POST /{id}/invite, DELETE /{id}/members/{user_id}."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.organizations.schemas import MemberInvite, MemberResponse, OrgCreate, OrgResponse
from src.organizations.service import (
    create_organization,
    delete_organization,
    get_organization,
    invite_member,
    remove_member,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("", response_model=OrgResponse, status_code=201)
async def create(
    body: OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrgResponse:
    org = await create_organization(db, current_user, body.name)
    return OrgResponse.model_validate(org)


@router.get("/{org_id}", response_model=OrgResponse)
async def get(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrgResponse:
    org = await get_organization(db, org_id, current_user)
    return OrgResponse.model_validate(org)


@router.delete("/{org_id}", status_code=204)
async def delete(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_organization(db, org_id, current_user)


@router.post("/{org_id}/invite", response_model=MemberResponse, status_code=201)
async def invite(
    org_id: uuid.UUID,
    body: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemberResponse:
    member = await invite_member(db, org_id, current_user, body.user_id, body.role)
    return MemberResponse.model_validate(member)


@router.delete("/{org_id}/members/{user_id}", status_code=204)
async def remove(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await remove_member(db, org_id, current_user, user_id)
