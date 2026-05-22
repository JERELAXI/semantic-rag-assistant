"""SQLAlchemy ORM models: KnowledgeBase (polymorphic owner: user or organization), KBShare."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Polymorphic owner: either a user or an organization
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "organization"
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document", back_populates="knowledge_base", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="knowledge_base", cascade="all, delete-orphan"
    )
    shares: Mapped[list["KBShare"]] = relationship(
        "KBShare", back_populates="knowledge_base", cascade="all, delete-orphan"
    )

    # Convenience back-references for polymorphic owner (joined via primaryjoin in auth/org models)
    owner_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        primaryjoin="and_(KnowledgeBase.owner_id == User.id, KnowledgeBase.owner_type == 'user')",
        foreign_keys="[KnowledgeBase.owner_id]",
        back_populates="knowledge_bases",
        viewonly=True,
    )
    owner_organization: Mapped["Organization | None"] = relationship(  # noqa: F821
        "Organization",
        primaryjoin="and_(KnowledgeBase.owner_id == Organization.id, KnowledgeBase.owner_type == 'organization')",
        foreign_keys="[KnowledgeBase.owner_id]",
        back_populates="knowledge_bases",
        viewonly=True,
    )


class KBShare(Base):
    __tablename__ = "kb_shares"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_with_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission: Mapped[str] = mapped_column(String(10), nullable=False)  # "viewer" | "editor"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (UniqueConstraint("knowledge_base_id", "shared_with_user_id", name="uq_kb_shares_kb_user"),)

    knowledge_base: Mapped["KnowledgeBase"] = relationship("KnowledgeBase", back_populates="shares")
    shared_with: Mapped["User"] = relationship("User", foreign_keys=[shared_with_user_id])  # noqa: F821
