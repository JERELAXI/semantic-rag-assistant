"""Shared embedding client — routes to OpenAI or NVIDIA NIM based on settings.embedding_provider."""

import asyncio

from openai import AsyncOpenAI

from src.core.config import settings

_BATCH_SIZE = 100


def _make_client() -> tuple[AsyncOpenAI, str]:
    if settings.embedding_provider == "nvidia":
        client = AsyncOpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
        )
        return client, settings.nvidia_embedding_model
    return AsyncOpenAI(api_key=settings.openai_api_key), settings.embedding_model


_client, _model = _make_client()

embedding_model_name: str = _model


async def embed_texts(texts: list[str], input_type: str = "passage") -> list[list[float]]:
    if not texts:
        return []

    async def _embed_batch(batch: list[str]) -> list[list[float]]:
        kwargs: dict = {"input": batch, "model": _model}
        if settings.embedding_provider == "nvidia":
            kwargs["extra_body"] = {"input_type": input_type}
        response = await _client.embeddings.create(**kwargs)
        return [item.embedding for item in response.data]

    batches = [texts[i : i + _BATCH_SIZE] for i in range(0, len(texts), _BATCH_SIZE)]
    results = await asyncio.gather(*[_embed_batch(b) for b in batches])
    return [vec for batch in results for vec in batch]


async def embed_query(query: str) -> list[float]:
    kwargs: dict = {"input": [query], "model": _model}
    if settings.embedding_provider == "nvidia":
        kwargs["extra_body"] = {"input_type": "query"}
    response = await _client.embeddings.create(**kwargs)
    return response.data[0].embedding
