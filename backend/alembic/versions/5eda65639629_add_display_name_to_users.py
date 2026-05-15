"""add display_name to users

Revision ID: 5eda65639629
Revises: 202f3fb7a67e
Create Date: 2026-05-15 10:33:19.708957

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '5eda65639629'
down_revision: Union[str, Sequence[str], None] = '202f3fb7a67e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('display_name', sa.String(length=100), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'display_name')
