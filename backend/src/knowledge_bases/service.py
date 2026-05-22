"""Knowledge-base business logic: CRUD, access control (owner, org member, or explicit share)."""

from __future__ import annotations

import uuid
from typing import Literal

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User
from src.core.exceptions import ForbiddenError, NotFoundError
from src.knowledge_bases.models import KBShare, KnowledgeBase
from src.organizations.models import OrganizationMember


async def _get_access_level(
    db: AsyncSession, kb_id: uuid.UUID, user: User
) -> tuple[KnowledgeBase, Literal["owner", "editor", "viewer"]] | None:
    """Return (kb, access_level) or None if the user has no access at all."""
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if kb is None:
        return None

    if kb.owner_type == "user" and kb.owner_id == user.id:
        return kb, "owner"

    if kb.owner_type == "organization":
        member = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == kb.owner_id,
                OrganizationMember.user_id == user.id,
            )
        )
        if member.scalar_one_or_none() is not None:
            return kb, "owner"

    share_result = await db.execute(
        select(KBShare).where(
            KBShare.knowledge_base_id == kb_id,
            KBShare.shared_with_user_id == user.id,
            KBShare.status == "accepted",
        )
    )
    share = share_result.scalar_one_or_none()
    if share is not None:
        return kb, share.permission  # type: ignore[return-value]

    return None


async def check_kb_access(
    db: AsyncSession, knowledge_base_id: uuid.UUID, user: User
) -> KnowledgeBase:
    """Raise 404 if user has no access (owner, org member, or any share level)."""
    result = await _get_access_level(db, knowledge_base_id, user)
    if result is None:
        raise NotFoundError("Knowledge base not found")
    return result[0]


async def check_kb_write_access(
    db: AsyncSession, knowledge_base_id: uuid.UUID, user: User
) -> KnowledgeBase:
    """Raise 404 if no access; 403 if viewer-only. Owner and editors pass."""
    result = await _get_access_level(db, knowledge_base_id, user)
    if result is None:
        raise NotFoundError("Knowledge base not found")
    kb, level = result
    if level == "viewer":
        raise ForbiddenError("Editor or owner access is required to upload documents")
    return kb


async def check_kb_owner(
    db: AsyncSession, knowledge_base_id: uuid.UUID, user: User
) -> KnowledgeBase:
    """Raise 404 if no access; 403 if not the owner."""
    result = await _get_access_level(db, knowledge_base_id, user)
    if result is None:
        raise NotFoundError("Knowledge base not found")
    kb, level = result
    if level != "owner":
        raise ForbiddenError("Only the knowledge base owner can perform this action")
    return kb


async def get_kb_with_permission(
    db: AsyncSession, kb_id: uuid.UUID, user: User
) -> tuple[KnowledgeBase, Literal["owner", "editor", "viewer"], str | None]:
    """Return (kb, permission, shared_by_name). Raises 404 if no access."""
    result = await _get_access_level(db, kb_id, user)
    if result is None:
        raise NotFoundError("Knowledge base not found")
    kb, permission = result
    shared_by_name: str | None = None
    if permission != "owner" and kb.owner_type == "user":
        owner_result = await db.execute(
            select(User.display_name).where(User.id == kb.owner_id)
        )
        shared_by_name = owner_result.scalar_one_or_none()
    return kb, permission, shared_by_name


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


async def list_knowledge_bases(
    db: AsyncSession, user: User
) -> list[tuple[KnowledgeBase, Literal["owner", "editor", "viewer"], str | None]]:
    """Return (kb, permission, shared_by_name) for all KBs accessible to user."""
    user_org_ids = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == user.id
    )
    owned_result = await db.execute(
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
    owned = list(owned_result.scalars().all())

    # Shared KBs: join through kb_shares → knowledge_bases → users (owner display name)
    shared_result = await db.execute(
        select(KnowledgeBase, User.display_name, KBShare.permission)
        .join(KBShare, KBShare.knowledge_base_id == KnowledgeBase.id)
        .join(User, User.id == KnowledgeBase.owner_id)
        .where(
            KBShare.shared_with_user_id == user.id,
            KnowledgeBase.owner_type == "user",
            KBShare.status == "accepted",
        )
        .order_by(KnowledgeBase.created_at.desc())
    )
    shared = shared_result.all()

    return (
        [(kb, "owner", None) for kb in owned]
        + [(kb, perm, display_name) for kb, display_name, perm in shared]
    )


async def delete_knowledge_base(
    db: AsyncSession, kb_id: uuid.UUID, user: User
) -> None:
    kb = await check_kb_owner(db, kb_id, user)
    await db.delete(kb)
    await db.commit()


async def share_kb(
    db: AsyncSession,
    kb_id: uuid.UUID,
    owner_user: User,
    target_email: str,
    permission: str,
) -> KBShare:
    await check_kb_owner(db, kb_id, owner_user)

    target_result = await db.execute(select(User).where(User.email == target_email))
    target = target_result.scalar_one_or_none()
    if target is None:
        raise NotFoundError(f"No user found with email '{target_email}'")
    if target.id == owner_user.id:
        raise ForbiddenError("Cannot share a knowledge base with yourself")

    existing_result = await db.execute(
        select(KBShare).where(
            KBShare.knowledge_base_id == kb_id,
            KBShare.shared_with_user_id == target.id,
        )
    )
    share = existing_result.scalar_one_or_none()
    if share is not None:
        share.permission = permission
    else:
        share = KBShare(
            knowledge_base_id=kb_id,
            shared_with_user_id=target.id,
            permission=permission,
        )
        db.add(share)
    await db.commit()

    # Reload with eager-loaded relationship so the router can read shared_with.*
    reload = await db.execute(
        select(KBShare)
        .options(selectinload(KBShare.shared_with))
        .where(
            KBShare.knowledge_base_id == kb_id,
            KBShare.shared_with_user_id == target.id,
        )
    )
    return reload.scalar_one()


async def unshare_kb(
    db: AsyncSession, kb_id: uuid.UUID, owner_user: User, target_user_id: uuid.UUID
) -> None:
    await check_kb_owner(db, kb_id, owner_user)

    result = await db.execute(
        select(KBShare).where(
            KBShare.knowledge_base_id == kb_id,
            KBShare.shared_with_user_id == target_user_id,
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise NotFoundError("Share record not found")
    await db.delete(share)
    await db.commit()


async def get_kb_shares(
    db: AsyncSession, kb_id: uuid.UUID, owner_user: User
) -> list[KBShare]:
    await check_kb_owner(db, kb_id, owner_user)

    result = await db.execute(
        select(KBShare)
        .options(selectinload(KBShare.shared_with))
        .where(KBShare.knowledge_base_id == kb_id)
        .order_by(KBShare.created_at.asc())
    )
    return list(result.scalars().all())


async def get_pending_invitations(
    db: AsyncSession, user: User
) -> list[tuple]:
    """Return (share, kb_name, owner_display_name) rows for pending invitations."""
    result = await db.execute(
        select(KBShare, KnowledgeBase.name, User.display_name)
        .join(KnowledgeBase, KnowledgeBase.id == KBShare.knowledge_base_id)
        .join(User, User.id == KnowledgeBase.owner_id)
        .where(
            KBShare.shared_with_user_id == user.id,
            KBShare.status == "pending",
            KnowledgeBase.owner_type == "user",
        )
        .order_by(KBShare.created_at.desc())
    )
    return list(result.all())


async def accept_invitation(
    db: AsyncSession, share_id: uuid.UUID, user: User
) -> None:
    result = await db.execute(
        select(KBShare).where(
            KBShare.id == share_id,
            KBShare.shared_with_user_id == user.id,
            KBShare.status == "pending",
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise NotFoundError("Invitation not found")
    share.status = "accepted"
    await db.commit()


async def decline_invitation(
    db: AsyncSession, share_id: uuid.UUID, user: User
) -> None:
    result = await db.execute(
        select(KBShare).where(
            KBShare.id == share_id,
            KBShare.shared_with_user_id == user.id,
            KBShare.status == "pending",
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise NotFoundError("Invitation not found")
    await db.delete(share)
    await db.commit()
