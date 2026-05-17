"""Hybrid search: pgvector cosine similarity + tsvector FTS, fused with Reciprocal Rank Fusion (RRF)."""

from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.chat.schemas import SearchResult
from src.core.embeddings import embed_query

_RRF_K = 60
_DEFAULT_CANDIDATE_POOL = 20

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
           ts_rank(c.fts_vector, plainto_tsquery('english', :query)) AS rank_score
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
     WHERE d.knowledge_base_id = :kb_id
       AND c.fts_vector @@ plainto_tsquery('english', :query)
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
        result = await self._db.execute(
            _FTS_SQL,
            {"query": query, "kb_id": knowledge_base_id, "top_k": top_k},
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

    async def hybrid_search(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        top_k: int = 5,
        candidate_pool: int = _DEFAULT_CANDIDATE_POOL,
    ) -> list[SearchResult]:
        embedding = await embed_query(query)

        vector_results = await self.vector_search(embedding, knowledge_base_id, candidate_pool)
        fts_results = await self.fts_search(query, knowledge_base_id, candidate_pool)

        return _rrf_fuse(vector_results, fts_results, top_k)

    async def search(
        self,
        query: str,
        knowledge_base_id: uuid.UUID,
        mode: str = "hybrid",
        top_k: int = 5,
    ) -> list[SearchResult]:
        if mode == "vector":
            embedding = await embed_query(query)
            return await self.vector_search(embedding, knowledge_base_id, top_k)
        if mode == "fts":
            return await self.fts_search(query, knowledge_base_id, top_k)
        return await self.hybrid_search(query, knowledge_base_id, top_k)


def _rrf_fuse(
    vector_results: list[SearchResult],
    fts_results: list[SearchResult],
    top_k: int,
) -> list[SearchResult]:
    scores: dict[uuid.UUID, float] = {}
    best: dict[uuid.UUID, SearchResult] = {}

    for rank, result in enumerate(vector_results, start=1):
        scores[result.chunk_id] = scores.get(result.chunk_id, 0.0) + 1.0 / (_RRF_K + rank)
        best.setdefault(result.chunk_id, result)

    for rank, result in enumerate(fts_results, start=1):
        scores[result.chunk_id] = scores.get(result.chunk_id, 0.0) + 1.0 / (_RRF_K + rank)
        best.setdefault(result.chunk_id, result)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]

    return [
        best[chunk_id].model_copy(update={"score": fused_score})
        for chunk_id, fused_score in ranked
    ]
