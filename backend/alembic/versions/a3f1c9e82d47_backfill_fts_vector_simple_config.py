"""backfill fts_vector with simple text search config

Revision ID: a3f1c9e82d47
Revises: 2b448502c14b
Create Date: 2026-05-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'a3f1c9e82d47'
down_revision: Union[str, Sequence[str], None] = '2b448502c14b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE chunks SET fts_vector = to_tsvector('simple', content)")


def downgrade() -> None:
    op.execute("UPDATE chunks SET fts_vector = to_tsvector('english', content)")
