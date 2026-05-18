import src.core.base  # noqa: F401  — registers all models for SQLAlchemy relationship discovery
import src.mcp_server.resources  # noqa: F401  — registers @mcp.resource() decorators
import src.mcp_server.tools  # noqa: F401  — registers @mcp.tool() decorators

from fastapi import Depends, FastAPI
from fastapi.exception_handlers import http_exception_handler
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException

from src.auth.router import router as auth_router
from src.chat.router import router as chat_router
from src.core.database import get_db
from src.documents.router import router as documents_router
from src.knowledge_bases.router import router as kb_router
from src.mcp_server.server import create_mcp_app
from src.organizations.router import router as organizations_router

app = FastAPI()

app.add_exception_handler(HTTPException, http_exception_handler)

app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(kb_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.mount("/mcp", create_mcp_app())


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
