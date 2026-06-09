"""RAG orchestration: retrieve chunks → build prompt → stream LLM response via SSE → save message and citations."""

from __future__ import annotations

import json
import re
import uuid
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.chat.models import Message, Session
from src.chat.reranker import rerank
from src.chat.retriever import HybridRetriever
from src.chat.schemas import CitationResponse, SearchResult
from src.chat.service import get_recent_messages, save_citations, save_message
from src.core.config import settings

_RERANKER_CANDIDATE_POOL = 20

_openai = AsyncOpenAI(api_key=settings.openai_api_key)

_MAX_HISTORY = 20

_CITATION_PATTERN = re.compile(r"\[(\d+)\]")

_SYSTEM_PROMPT = """\
You are a retrieval-grounded assistant. You answer questions about the user's documents \
using ONLY the context chunks provided below.

Strict rules:
1. Answer ONLY based on the provided context. Do not use your general knowledge, \
training data, or outside information — even if you are confident it is correct.
2. If the context does not contain enough information to answer the question, respond \
with a brief one-sentence refusal in the EXACT same language as the user's question. \
Examples by language — Ukrainian: "У завантажених документах недостатньо інформації, \
щоб відповісти на це питання."; English: "The loaded documents do not contain enough \
information to answer this question."; Polish: "Załadowane dokumenty nie zawierają \
wystarczających informacji, aby odpowiedzieć na to pytanie." — match the user's language \
exactly. Do not attempt a partial or speculative answer.
3. Always cite your sources using [1], [2], etc. — the numbers correspond to the [N] \
labels in the context section. Every factual claim must have a citation. If a sentence \
draws on multiple chunks, cite all of them, e.g. [1][3].
4. Keep answers concise and directly relevant to the question. Do not pad with general \
background, definitions, or commentary that is not asked for.
5. CRITICAL — language rule: always respond in the same language as the user's question \
without exception. The context may be in any language — use it regardless, translating \
as needed. A question in Ukrainian MUST be answered in Ukrainian. A question in English \
MUST be answered in English. This applies to refusals, citations, and all output.
6. Do not treat tangential mentions as project facts. If a technology, framework, or \
tool is only MENTIONED in passing in the context (e.g., as a dependency, as part of a \
library name, or in a comparison table) but is NOT described as being used in the \
project — do NOT claim it is used in the project. Only state something is part of the \
project if the context explicitly says so. Examples: if context says "uv is built in \
Rust" — this does NOT mean Rust is used in the project, it means the tool uv happens \
to be written in Rust. If context mentions "pgvector uses C++ internally" — this does \
NOT mean C++ is part of the project.

Context:
{context}"""


def _auto_title(query: str, max_len: int = 40) -> str:
    """Generate a short session title from the user's first message.

    Truncates to max_len, trimmed back to the last word boundary so we don't cut
    mid-word. Adds "…" when truncation actually shortened the input.
    """
    cleaned = " ".join(query.strip().split())  # collapse whitespace
    if len(cleaned) <= max_len:
        return cleaned
    truncated = cleaned[:max_len]
    last_space = truncated.rfind(" ")
    if last_space > 0:
        truncated = truncated[:last_space]
    return truncated + "…"


def _filter_and_renumber(
    response_text: str, search_results: list[SearchResult]
) -> tuple[str, list[SearchResult]]:
    """Keep only citations the LLM actually used; renumber sequentially by first appearance.

    Returns (rewritten_text, filtered_results). Orphan citation markers (referencing
    indices outside the retrieved range) are stripped from the text.
    """
    n_results = len(search_results)
    # Map old citation number → new sequential number, ordered by first appearance in text.
    remap: dict[int, int] = {}
    for match in _CITATION_PATTERN.finditer(response_text):
        old = int(match.group(1))
        if 1 <= old <= n_results and old not in remap:
            remap[old] = len(remap) + 1

    def _replace(match: re.Match[str]) -> str:
        old = int(match.group(1))
        return f"[{remap[old]}]" if old in remap else ""

    rewritten = _CITATION_PATTERN.sub(_replace, response_text)
    # filtered_results in new-numbering order
    filtered = [search_results[old - 1] for old, _ in sorted(remap.items(), key=lambda kv: kv[1])]
    return rewritten, filtered


def _format_context(results: list[SearchResult]) -> str:
    parts: list[str] = []
    for i, r in enumerate(results, start=1):
        parts.append(f'[{i}] (from "{r.document_title}"):\n{r.content}')
    return "\n\n".join(parts) if parts else "(no relevant context found)"


def _build_messages(
    history: list[Message], search_results: list[SearchResult]
) -> list[dict[str, str]]:
    system = {
        "role": "system",
        "content": _SYSTEM_PROMPT.format(context=_format_context(search_results)),
    }
    chat = [{"role": m.role, "content": m.content} for m in history]
    return [system, *chat]


class RAGPipeline:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def stream_response(
        self,
        session_id: uuid.UUID,
        query: str,
        search_mode: str = "hybrid",
        top_k: int = 5,
    ) -> AsyncGenerator[str, None]:
        await save_message(self._db, session_id, "user", query)

        session = await self._get_session(session_id)

        # Auto-title on the first user message (session.title starts NULL unless the
        # caller passed one explicitly when creating the session).
        new_title: str | None = None
        if session.title is None:
            new_title = _auto_title(query)
            session.title = new_title
            await self._db.commit()

        kb_id = session.knowledge_base_id

        history = await get_recent_messages(self._db, session_id, _MAX_HISTORY)

        retriever = HybridRetriever(self._db)
        if settings.reranker_enabled:
            search_results = await retriever.search(
                query, kb_id, mode=search_mode, top_k=_RERANKER_CANDIDATE_POOL,
            )
            search_results = await rerank(query, search_results)
            search_results = search_results[:top_k]
        else:
            search_results = await retriever.search(query, kb_id, mode=search_mode, top_k=top_k)

        messages = _build_messages(history, search_results)

        assistant_content = ""
        stream = await _openai.chat.completions.create(
            model=settings.chat_model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                assistant_content += delta.content
                yield _sse({"token": delta.content})

        # Drop chunks the LLM didn't actually cite, renumber sequentially.
        # `final_content` is sent on `done` so frontends can swap in the renumbered text live.
        final_content, cited_results = _filter_and_renumber(assistant_content, search_results)

        msg = await save_message(self._db, session_id, "assistant", final_content)
        await save_citations(self._db, msg.id, cited_results)

        citations = [
            CitationResponse(
                chunk_id=r.chunk_id,
                document_title=r.document_title,
                # Show the raw chunk to the user — `r.content` may carry a "Context: ..."
                # prefix added during contextual chunking; the user should never see that.
                # Full text — citation panel scrolls.
                content_excerpt=r.metadata.get("original_content") or r.content,
                # Show pre-fusion vector cosine similarity (e.g. 0.58 → "58% match").
                # Fall back to `score` for FTS-only chunks where no vector similarity exists.
                relevance_score=r.vector_score if r.vector_score is not None else r.score,
            )
            for r in cited_results
        ]
        yield _sse({"citations": [c.model_dump(mode="json") for c in citations]})

        done_payload: dict = {"done": True, "final_content": final_content}
        if new_title is not None:
            done_payload["session_title"] = new_title
        yield _sse(done_payload)

    async def _get_session(self, session_id: uuid.UUID) -> Session:
        result = await self._db.execute(
            select(Session).where(Session.id == session_id)
        )
        return result.scalar_one()


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
