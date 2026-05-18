"""Chat business logic: session/message CRUD, save citations."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.auth.models import User
from src.chat.models import Message, MessageCitation, Session
from src.chat.schemas import SearchResult
from src.core.exceptions import NotFoundError
from src.documents.models import Chunk
from src.knowledge_bases.service import check_kb_access


async def create_session(
    db: AsyncSession,
    user: User,
    knowledge_base_id: uuid.UUID,
    title: str | None,
) -> Session:
    await check_kb_access(db, knowledge_base_id, user)
    session = Session(
        user_id=user.id,
        knowledge_base_id=knowledge_base_id,
        title=title,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_user_sessions(db: AsyncSession, user: User) -> list[Session]:
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.updated_at.desc())
    )
    return list(result.scalars().all())


async def _get_owned_session(
    db: AsyncSession, session_id: uuid.UUID, user: User
) -> Session:
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None or session.user_id != user.id:
        raise NotFoundError("Session not found")
    return session


async def get_session(
    db: AsyncSession, session_id: uuid.UUID, user: User
) -> Session:
    return await _get_owned_session(db, session_id, user)


async def get_session_with_messages(
    db: AsyncSession, session_id: uuid.UUID, user: User
) -> Session:
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id)
        .options(
            selectinload(Session.messages)
            .selectinload(Message.citations)
            .joinedload(MessageCitation.chunk)
            .joinedload(Chunk.document)
        )
    )
    session = result.unique().scalar_one_or_none()
    if session is None or session.user_id != user.id:
        raise NotFoundError("Session not found")
    return session


async def delete_session(
    db: AsyncSession, session_id: uuid.UUID, user: User
) -> None:
    session = await _get_owned_session(db, session_id, user)
    await db.delete(session)
    await db.commit()


async def save_message(
    db: AsyncSession, session_id: uuid.UUID, role: str, content: str
) -> Message:
    message = Message(session_id=session_id, role=role, content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_recent_messages(
    db: AsyncSession, session_id: uuid.UUID, limit: int = 20
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    return messages


async def save_citations(
    db: AsyncSession,
    message_id: uuid.UUID,
    results: list[SearchResult],
) -> None:
    for rank, r in enumerate(results, start=1):
        db.add(MessageCitation(
            message_id=message_id,
            chunk_id=r.chunk_id,
            rank=rank,
            score=r.score,
        ))
    await db.commit()
