"""Organization business logic: CRUD, invite/remove members, role checks."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User
from src.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from src.organizations.models import Organization, OrganizationMember


async def _get_member(
    db: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID
) -> OrganizationMember | None:
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _require_member(
    db: AsyncSession, org_id: uuid.UUID, user: User
) -> OrganizationMember:
    member = await _get_member(db, org_id, user.id)
    if member is None:
        raise NotFoundError("Organization not found")
    return member


async def _require_owner(
    db: AsyncSession, org_id: uuid.UUID, user: User
) -> OrganizationMember:
    member = await _require_member(db, org_id, user)
    if member.role != "owner":
        raise ForbiddenError("Only the organization owner can perform this action")
    return member


async def _load_org(db: AsyncSession, org_id: uuid.UUID) -> Organization:
    result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.members))
        .where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organization not found")
    return org


async def create_organization(db: AsyncSession, user: User, name: str) -> Organization:
    org = Organization(name=name)
    db.add(org)
    await db.flush()

    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="owner"))
    await db.commit()

    return await _load_org(db, org.id)


async def get_organization(db: AsyncSession, org_id: uuid.UUID, user: User) -> Organization:
    await _require_member(db, org_id, user)
    return await _load_org(db, org_id)


async def delete_organization(db: AsyncSession, org_id: uuid.UUID, user: User) -> None:
    await _require_owner(db, org_id, user)
    org = await _load_org(db, org_id)
    await db.delete(org)
    await db.commit()


async def invite_member(
    db: AsyncSession,
    org_id: uuid.UUID,
    user: User,
    invitee_id: uuid.UUID,
    role: str,
) -> OrganizationMember:
    await _require_owner(db, org_id, user)

    invitee = await db.get(User, invitee_id)
    if invitee is None:
        raise NotFoundError("User not found")

    if await _get_member(db, org_id, invitee_id) is not None:
        raise ConflictError("User is already a member of this organization")

    member = OrganizationMember(organization_id=org_id, user_id=invitee_id, role=role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def remove_member(
    db: AsyncSession,
    org_id: uuid.UUID,
    user: User,
    target_user_id: uuid.UUID,
) -> None:
    await _require_owner(db, org_id, user)

    if target_user_id == user.id:
        raise ForbiddenError("Owner cannot remove themselves")

    target = await _get_member(db, org_id, target_user_id)
    if target is None:
        raise NotFoundError("Member not found")

    await db.delete(target)
    await db.commit()
