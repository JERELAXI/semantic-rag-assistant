"""SQLAlchemy ORM model: KnowledgeBase (polymorphic owner: user or organization)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.src.core.database import Base


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

    # Convenience back-references for polymorphic owner (joined via primaryjoin in auth/org models)
    owner_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        primaryjoin="and_(KnowledgeBase.owner_id == foreign(User.id), KnowledgeBase.owner_type == 'user')",
        back_populates="knowledge_bases",
        viewonly=True,
    )
    owner_organization: Mapped["Organization | None"] = relationship(  # noqa: F821
        "Organization",
        primaryjoin="and_(KnowledgeBase.owner_id == foreign(Organization.id), KnowledgeBase.owner_type == 'organization')",
        back_populates="knowledge_bases",
        viewonly=True,
    )