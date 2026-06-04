"""FastMCP server instance and SSE transport factory."""

from contextvars import ContextVar

from mcp.server.fastmcp import FastMCP
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount

from src.auth.models import User

mcp = FastMCP("semantic-rag-assistant")

_session_user: ContextVar[User | None] = ContextVar("session_user", default=None)


def get_session_user() -> User:
    user = _session_user.get()
    if user is None:
        raise ValueError("Not authenticated — add ?api_key=srag_... to the MCP server URL")
    return user


def create_mcp_app() -> Starlette:
    # Use /api/mcp/messages/ — same nginx location as SSE (/api/mcp/),
    # avoiding any routing mismatch with the /mcp/ location block.
    transport = SseServerTransport("/api/mcp/messages/")

    async def sse_endpoint(scope, receive, send):
        """Raw ASGI handler — avoids Starlette expecting a Response return value."""
        from src.api_keys.service import verify_api_key
        from src.core.database import AsyncSessionLocal
        from src.core.exceptions import AuthError

        request = Request(scope, receive, send)
        api_key = request.query_params.get("api_key", "")

        if not api_key:
            resp = Response("api_key query parameter is required", status_code=401)
            await resp(scope, receive, send)
            return

        async with AsyncSessionLocal() as db:
            try:
                user = await verify_api_key(db, api_key)
            except AuthError:
                resp = Response("Invalid or revoked API key", status_code=401)
                await resp(scope, receive, send)
                return

        token = _session_user.set(user)
        try:
            async with transport.connect_sse(scope, receive, send) as streams:
                await mcp._mcp_server.run(
                    streams[0],
                    streams[1],
                    mcp._mcp_server.create_initialization_options(),
                )
        finally:
            _session_user.reset(token)

    return Starlette(routes=[
        Mount("/sse", app=sse_endpoint),
        Mount("/messages/", app=transport.handle_post_message),
    ])
