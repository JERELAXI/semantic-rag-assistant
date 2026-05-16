"""Knowledge-base business logic: CRUD, access control (owner or org member)."""

import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.exceptions import ForbiddenError, NotFoundError
from src.knowledge_bases.models import KnowledgeBase
from src.organizations.models import OrganizationMember


async def check_kb_access(
    db: AsyncSession, knowledge_base_id: uuid.UUID, user: User
) -> KnowledgeBase:
    """Return KB if user is the owner or a member of the owning org; raise 404 otherwise."""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id)
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise NotFoundError("Knowledge base not found")

    if kb.owner_type == "user" and kb.owner_id == user.id:
        return kb

    if kb.owner_type == "organization":
        member = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == kb.owner_id,
                OrganizationMember.user_id == user.id,
            )
        )
        if member.scalar_one_or_none() is not None:
            return kb

    raise NotFoundError("Knowledge base not found")


async def create_knowledge_base(
    db: AsyncSession,
    user: User,
    name: str,
    description: str | None,
    owner_type: str,
    owner_id: uuid.UUID | None,
) -> KnowledgeBase:
    if owner_type == "organization":
        member = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == owner_id,
                OrganizationMember.user_id == user.id,
            )
        )
        if member.scalar_one_or_none() is None:
            raise ForbiddenError("You are not a member of this organization")
        actual_owner_id = owner_id
    else:
        actual_owner_id = user.id

    kb = KnowledgeBase(
        name=name,
        description=description,
        owner_type=owner_type,
        owner_id=actual_owner_id,
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


async def get_knowledge_base(
    db: AsyncSession, kb_id: uuid.UUID, user: User
) -> KnowledgeBase:
    return await check_kb_access(db, kb_id, user)


async def list_knowledge_bases(db: AsyncSession, user: User) -> list[KnowledgeBase]:
    user_org_ids = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == user.id
    )
    result = await db.execute(
        select(KnowledgeBase)
        .where(
            or_(
                and_(KnowledgeBase.owner_type == "user", KnowledgeBase.owner_id == user.id),
                and_(
                    KnowledgeBase.owner_type == "organization",
                    KnowledgeBase.owner_id.in_(user_org_ids),
                ),
            )
        )
        .order_by(KnowledgeBase.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_knowledge_base(
    db: AsyncSession, kb_id: uuid.UUID, user: User
) -> None:
    kb = await check_kb_access(db, kb_id, user)
    await db.delete(kb)
    await db.commit()
