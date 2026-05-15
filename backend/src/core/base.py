"""Model registry — import every feature model so SQLAlchemy registers all
tables and relationships on Base.metadata before any query or migration runs.

Import this module (not individual model files) anywhere that needs the full
metadata: alembic/env.py and anywhere Base.metadata is introspected.
"""

import src.auth.models  # noqa: F401
import src.organizations.models  # noqa: F401
import src.knowledge_bases.models  # noqa: F401
import src.documents.models  # noqa: F401
import src.chat.models  # noqa: F401
