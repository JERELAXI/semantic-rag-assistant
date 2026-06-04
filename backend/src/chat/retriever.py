"""Hybrid search: pgvector cosine similarity + tsvector FTS, fused with Reciprocal Rank Fusion (RRF)."""

from __future__ import annotations

import asyncio
import logging
import re
import uuid

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.chat.reranker import rerank
from src.chat.schemas import SearchResult
from src.core.config import settings
from src.core.embeddings import embed_query, embed_texts

logger = logging.getLogger(__name__)

_llm_client = AsyncOpenAI(api_key=settings.openai_api_key)

_RRF_K = 60
_DEFAULT_CANDIDATE_POOL = 20

_HYDE_PROMPT = (
    "Given the question below, write a short paragraph that would be a perfect answer "
    "found in a document. Do not say 'I think' or 'The answer is'. Just write the content "
    "as if you're reading it from the actual document.\n\nQuestion: {query}"
)

_EXPAND_PROMPT = (
    "Generate 3 alternative search queries for this question. Use different keywords and "
    "phrasing. One per line, no numbering.\n\nQuestion: {query}"
)

# Matches alphanumeric/underscore runs (Unicode-aware) — anything else becomes a separator.
# Drops punctuation/operators that would break to_tsquery() syntax.
_TSQUERY_TOKEN = re.compile(r"\w+", re.UNICODE)


async def _empty_str() -> str:
    return ""


def _build_or_tsquery(query: str) -> str:
    """Tokenize a free-form query into an OR tsquery expression, e.g. 'foo | bar | baz'.

    Returns an empty string when no usable tokens remain — callers must short-circuit,
    since to_tsquery('') raises a syntax error in PostgreSQL.
    """
    tokens = _TSQUERY_TOKEN.findall(query)
    return " | ".join(tokens)

_VECTOR_SQL = text("""
    SELECT c.id        AS chunk_id,
           c.content,
           c.metadata,
           d.id         AS document_id,
           d.filename   AS document_title,
           e.vector <=> :embedding AS distance
      FROM chunks c
      JOIN embeddings e ON e.chunk_id = c.id
      JOIN documents d  ON d.id = c.document_id
     WHERE d.knowledge_base_id = :kb_id
     ORDER BY distance
     LIMIT :top_k
""")

_FTS_SQL = text("""
    SELECT c.id        AS chunk_id,
           c.content,
           c.metadata,
           d.id         AS document_id,
           d.filename   AS document_title,
           ts_rank(c.fts_vector, to_tsquery('simple', :tsquery)) AS rank_score
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
     WHERE d.knowledge_base_id = :kb_id
       AND c.fts_vector @@ to_tsquery('simple', :tsquery)
     ORDER BY rank_score DESC
     LIMIT :top_k
""")


class HybridRetriever:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def vector_search(
        self,
        embedding: list[float],
        knowledge_base_id: uuid.UUID,
        top_k: int = _DEFAULT_CANDIDATE_POOL,
    ) -> list[SearchResult]:
        result = await self._db.execute(
            _VECTOR_SQL,
            {"embedding": str(embedding), "kb_id": knowledge_base_id, "top_k": top_k},
        )
        rows = result.mappings().all()
        return [
            SearchResult(
                chunk_id=row["chunk_id"],
                content=row["content"],
                score=1 - float(row["distance"]),
                vector_score=1 - float(row["distance"]),
                document_id=row["document_id"],
                document_title=row["document_title"],
                metadata=row["metadata"] or {},
            )
            for row in rows
        ]

    async def fts_search(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        top_k: int = _DEFAULT_CANDIDATE_POOL,
    ) -> list[SearchResult]:
        tsquery = _build_or_tsquery(query)
        if not tsquery:
            return []

        result = await self._db.execute(
            _FTS_SQL,
            {"tsquery": tsquery, "kb_id": knowledge_base_id, "top_k": top_k},
        )
        rows = result.mappings().all()
        return [
            SearchResult(
                chunk_id=row["chunk_id"],
                content=row["content"],
                score=float(row["rank_score"]),
                document_id=row["document_id"],
                document_title=row["document_title"],
                metadata=row["metadata"] or {},
            )
            for row in rows
        ]

    async def generate_hypothetical_answer(self, query: str) -> str:
        """HyDE: generate a plausible answer paragraph to embed instead of the raw query.

        Returns an empty string on failure — callers fall back to the raw query.
        """
        try:
            response = await _llm_client.chat.completions.create(
                model=settings.chat_model,
                max_tokens=200,
                temperature=0.0,
                messages=[{"role": "user", "content": _HYDE_PROMPT.format(query=query)}],
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("HyDE generation failed (falling back to raw query): %s", exc)
            return ""

    async def expand_query(self, query: str) -> list[str]:
        """Generate up to 3 alternative phrasings of the query. Returns [] on failure."""
        try:
            response = await _llm_client.chat.completions.create(
                model=settings.chat_model,
                max_tokens=150,
                temperature=0.7,
                messages=[{"role": "user", "content": _EXPAND_PROMPT.format(query=query)}],
            )
            content = (response.choices[0].message.content or "").strip()
            variants = [line.strip() for line in content.splitlines() if line.strip()]
            return variants[:3]
        except Exception as exc:
            logger.warning("Query expansion failed (falling back to single query): %s", exc)
            return []

    async def _embed_for_vector(self, query: str, override_hyde: bool | None = None) -> list[float]:
        """Embed via HyDE (hypothetical answer) when enabled, else embed the raw query."""
        use_hyde = override_hyde if override_hyde is not None else settings.hyde_enabled
        text_to_embed = query
        if use_hyde:
            hypothetical = await self.generate_hypothetical_answer(query)
            if hypothetical:
                text_to_embed = hypothetical
        return await embed_query(text_to_embed)

    async def hybrid_search(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        top_k: int = 5,
        candidate_pool: int = _DEFAULT_CANDIDATE_POOL,
        override_hyde: bool | None = None,
    ) -> list[SearchResult]:
        embedding = await self._embed_for_vector(query, override_hyde)

        vector_results = await self.vector_search(embedding, knowledge_base_id, candidate_pool)
        fts_results = await self.fts_search(query, knowledge_base_id, candidate_pool)

        return _rrf_fuse(vector_results, fts_results, top_k)

    async def _multi_query_hybrid(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        top_k: int,
        candidate_pool: int = _DEFAULT_CANDIDATE_POOL,
        override_hyde: bool | None = None,
    ) -> list[SearchResult]:
        """Run hybrid search for the original query + expanded variants, merge by chunk_id.

        Three concurrent phases instead of fully sequential LLM/DB calls:
          1. expand_query + HyDE(original) in parallel
          2. Embed [hyde_or_query, *variants] in a single batch call
          3. All vector + FTS searches in parallel
        HyDE is applied to the original query only; variants ride raw embeddings.
        """
        use_hyde = override_hyde if override_hyde is not None else settings.hyde_enabled
        expand_task = self.expand_query(query)
        hyde_task = self.generate_hypothetical_answer(query) if use_hyde else _empty_str()
        variants, hypothetical = await asyncio.gather(expand_task, hyde_task)

        all_queries = [query, *variants]
        original_text_to_embed = hypothetical or query
        embeddings = await embed_texts([original_text_to_embed, *variants], input_type="query")

        search_tasks: list = []
        for emb, q in zip(embeddings, all_queries):
            search_tasks.append(self.vector_search(emb, knowledge_base_id, candidate_pool))
            search_tasks.append(self.fts_search(q, knowledge_base_id, candidate_pool))
        search_results = await asyncio.gather(*search_tasks)

        merged: dict[uuid.UUID, SearchResult] = {}
        for i in range(len(all_queries)):
            vec_res = search_results[2 * i]
            fts_res = search_results[2 * i + 1]
            fused = _rrf_fuse(vec_res, fts_res, candidate_pool)
            for r in fused:
                existing = merged.get(r.chunk_id)
                if existing is None or r.score > existing.score:
                    merged[r.chunk_id] = r

        return sorted(merged.values(), key=lambda r: r.score, reverse=True)[:top_k]

    async def search(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        mode: str = "hybrid",
        top_k: int = 5,
        override_hyde: bool | None = None,
        override_query_expansion: bool | None = None,
        override_reranker: bool | None = None,
    ) -> list[SearchResult]:
        use_query_expansion = override_query_expansion if override_query_expansion is not None else settings.query_expansion_enabled
        use_reranker = override_reranker if override_reranker is not None else settings.reranker_enabled

        # Pull a larger candidate pool when reranking so the reranker has more to score over
        pool = max(top_k * 4, _DEFAULT_CANDIDATE_POOL) if use_reranker else top_k

        if mode == "vector":
            embedding = await self._embed_for_vector(query, override_hyde)
            results = await self.vector_search(embedding, knowledge_base_id, pool)
        elif mode == "fts":
            results = await self.fts_search(query, knowledge_base_id, pool)
        elif use_query_expansion:
            results = await self._multi_query_hybrid(query, knowledge_base_id, pool, override_hyde=override_hyde)
        else:
            results = await self.hybrid_search(query, knowledge_base_id, pool, override_hyde=override_hyde)

        if use_reranker:
            results = await rerank(query, results, force=True)

        return results[:top_k]


def _rrf_fuse(
    vector_results: list[SearchResult],
    fts_results: list[SearchResult],
    top_k: int,
) -> list[SearchResult]:
    scores: dict[uuid.UUID, float] = {}
    best: dict[uuid.UUID, SearchResult] = {}
    # Preserve the cosine similarity from vector_results so the UI can show a meaningful percentage
    # even after the fused `score` becomes a small RRF value.
    vector_scores: dict[uuid.UUID, float] = {r.chunk_id: r.score for r in vector_results}

    for rank, result in enumerate(vector_results, start=1):
        scores[result.chunk_id] = scores.get(result.chunk_id, 0.0) + 1.0 / (_RRF_K + rank)
        best.setdefault(result.chunk_id, result)

    for rank, result in enumerate(fts_results, start=1):
        scores[result.chunk_id] = scores.get(result.chunk_id, 0.0) + 1.0 / (_RRF_K + rank)
        best.setdefault(result.chunk_id, result)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]

    return [
        best[chunk_id].model_copy(update={
            "score": fused_score,
            "vector_score": vector_scores.get(chunk_id),
        })
        for chunk_id, fused_score in ranked
    ]
