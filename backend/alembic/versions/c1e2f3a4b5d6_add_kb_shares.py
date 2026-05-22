"""add kb_shares table

Revision ID: c1e2f3a4b5d6
Revises: a3f1c9e82d47
Create Date: 2026-05-23 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c1e2f3a4b5d6'
down_revision: Union[str, Sequence[str], None] = 'a3f1c9e82d47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'kb_shares',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('knowledge_base_id', sa.UUID(), nullable=False),
        sa.Column('shared_with_user_id', sa.UUID(), nullable=False),
        sa.Column('permission', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('knowledge_base_id', 'shared_with_user_id', name='uq_kb_shares_kb_user'),
    )
    op.create_index('ix_kb_shares_knowledge_base_id', 'kb_shares', ['knowledge_base_id'])
    op.create_index('ix_kb_shares_shared_with_user_id', 'kb_shares', ['shared_with_user_id'])


def downgrade() -> None:
    op.drop_index('ix_kb_shares_shared_with_user_id', table_name='kb_shares')
    op.drop_index('ix_kb_shares_knowledge_base_id', table_name='kb_shares')
    op.drop_table('kb_shares')
