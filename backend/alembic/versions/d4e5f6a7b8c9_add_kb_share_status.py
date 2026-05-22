"""add status column to kb_shares

Revision ID: d4e5f6a7b8c9
Revises: c1e2f3a4b5d6
Create Date: 2026-05-23 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c1e2f3a4b5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first so we can backfill before enforcing NOT NULL
    op.add_column('kb_shares', sa.Column('status', sa.String(length=10), nullable=True))
    # Backfill existing rows to "accepted" so no current user loses access
    op.execute("UPDATE kb_shares SET status = 'accepted'")
    op.alter_column('kb_shares', 'status', nullable=False)
    op.execute("ALTER TABLE kb_shares ALTER COLUMN status SET DEFAULT 'pending'")


def downgrade() -> None:
    op.drop_column('kb_shares', 'status')
