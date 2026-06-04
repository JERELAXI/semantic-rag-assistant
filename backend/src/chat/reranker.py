"""Reranker — calls NVIDIA NIM /ranking endpoint to re-score retrieved chunks."""

from __future__ import annotations

import logging

import httpx

from src.chat.schemas import SearchResult
from src.core.config import settings

logger = logging.getLogger(__name__)

_RANKING_URL = f"{settings.nvidia_base_url}/ranking"
_TIMEOUT = 30.0


async def rerank(
    query: str,
    results: list[SearchResult],
    *,
    force: bool = False,
) -> list[SearchResult]:
    if not (force or settings.reranker_enabled) or not results:
        return results

    try:
        return await _call_reranker(query, results)
    except Exception:
        logger.exception("Reranker failed, falling back to original ranking")
        return results


async def _call_reranker(
    query: str,
    results: list[SearchResult],
) -> list[SearchResult]:
    payload = {
        "model": settings.nvidia_rerank_model,
        "query": {"text": query},
        "passages": [{"text": r.content} for r in results],
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            _RANKING_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

    data = response.json()
    rankings = sorted(data["rankings"], key=lambda r: r["logit"], reverse=True)

    top = rankings[: settings.reranker_top_k]
    return [
        results[r["index"]].model_copy(update={"score": r["logit"]})
        for r in top
    ]
