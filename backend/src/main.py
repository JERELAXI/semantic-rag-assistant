import src.core.base  # noqa: F401  — registers all models for SQLAlchemy relationship discovery
import src.mcp_server.resources  # noqa: F401  — registers @mcp.resource() decorators
import src.mcp_server.tools  # noqa: F401  — registers @mcp.tool() decorators

from fastapi import Depends, FastAPI
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

from src.auth.router import router as auth_router
from src.chat.router import router as chat_router
from src.core.config import settings
from src.core.database import get_db
from src.core.rate_limit import limiter
from src.documents.router import router as documents_router
from src.knowledge_bases.router import router as kb_router
from src.mcp_server.server import create_mcp_app
from src.organizations.router import router as organizations_router


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware is applied in reverse-registration order (last added = outermost).
# CORS must be outermost so preflight requests are handled before auth/rate-limit.
app.add_middleware(_SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"chrome-extension://[a-z]{32}",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
