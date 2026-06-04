"""FastMCP server instance and SSE transport factory."""

from contextvars import ContextVar

from mcp.server.fastmcp import FastMCP
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount, Route

from src.auth.models import User

mcp = FastMCP("semantic-rag-assistant")

_session_user: ContextVar[User | None] = ContextVar("session_user", default=None)


def get_session_user() -> User:
    user = _session_user.get()
    if user is None:
        raise ValueError("Not authenticated — add ?api_key=srag_... to the MCP server URL")
    return user


def create_mcp_app() -> Starlette:
    # MCP SDK builds the endpoint URI it advertises to the client as
    # `scope["root_path"] + self._endpoint`. We're mounted under `/mcp` in
    # FastAPI, so root_path is `/mcp` and the advertised endpoint becomes
    # `/mcp/messages/`. Using Mount("/sse", ...) would add another `/sse`
    # segment to root_path and break the URL — use Route() instead.
    transport = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> Response:
        from src.api_keys.service import verify_api_key
        from src.core.database import AsyncSessionLocal
        from src.core.exceptions import AuthError

        api_key = request.query_params.get("api_key", "")
        if not api_key:
            return Response("api_key query parameter is required", status_code=401)

        async with AsyncSessionLocal() as db:
            try:
                user = await verify_api_key(db, api_key)
            except AuthError:
                return Response("Invalid or revoked API key", status_code=401)

        token = _session_user.set(user)
        try:
            async with transport.connect_sse(
                request.scope, request.receive, request._send
            ) as streams:
                await mcp._mcp_server.run(
                    streams[0],
                    streams[1],
                    mcp._mcp_server.create_initialization_options(),
                )
        finally:
            _session_user.reset(token)
        return Response()

    return Starlette(routes=[
        Route("/sse", endpoint=handle_sse, methods=["GET"]),
        Mount("/messages/", app=transport.handle_post_message),
    ])
