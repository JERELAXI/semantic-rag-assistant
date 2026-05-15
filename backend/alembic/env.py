import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

from alembic import context

# ---------------------------------------------------------------------------
# Import all models so their tables are registered on Base.metadata before
# autogenerate runs. The order matters only for readability — SQLAlchemy
# resolves FK dependencies automatically.
# ---------------------------------------------------------------------------
import src.auth.models  # noqa: F401  — User, RefreshToken
import src.organizations.models  # noqa: F401  — Organization, OrganizationMember
import src.knowledge_bases.models  # noqa: F401  — KnowledgeBase
import src.documents.models  # noqa: F401  — Document, Chunk, Embedding
import src.chat.models  # noqa: F401  — Session, Message, MessageCitation

from backend.src.core.config import settings
from backend.src.core.database import Base


# ---------------------------------------------------------------------------
# Alembic Config
# ---------------------------------------------------------------------------
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject the real DATABASE_URL from our settings (overrides alembic.ini)
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline mode — emits SQL to stdout without a live connection
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode — async engine, runs inside asyncio.run()
# ---------------------------------------------------------------------------
def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
