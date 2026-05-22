"""Background worker: parse file → split into chunks → generate embeddings → save to DB → set status ready."""

import asyncio
import logging
import math
import re
import uuid
from pathlib import Path

import fitz
from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import AsyncSessionLocal
from src.core.embeddings import embed_texts, embedding_model_name
from src.documents.models import Chunk, Document, Embedding, EMBEDDING_DIM

logger = logging.getLogger(__name__)

_llm_client = AsyncOpenAI(api_key=settings.openai_api_key)
_CONTEXT_CONCURRENCY = 10

_SEMANTIC_SIM_THRESHOLD = 0.5
_SEMANTIC_SENTENCE_WINDOW = 3
_SEMANTIC_MIN_TOKENS = 100
_SEMANTIC_MAX_TOKENS = 1024

# Splits on sentence-terminating punctuation followed by whitespace/newline, or on blank lines.
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])[ \n]+|\n{2,}")

_CONTEXT_PROMPT = (
    "Document title: {title}. "
    "Given the following chunk from this document, write 2-3 sentences of context "
    "explaining what this chunk is about and where it fits in the document. Be specific.\n\n"
    "Chunk:\n{chunk}"
)


async def _contextualize_chunk(doc_title: str, chunk_text: str, sem: asyncio.Semaphore) -> str:
    """Generate a 2-3 sentence context blurb for a chunk. Returns '' on failure."""
    async with sem:
        try:
            response = await _llm_client.chat.completions.create(
                model=settings.chat_model,
                max_tokens=100,
                messages=[{
                    "role": "user",
                    "content": _CONTEXT_PROMPT.format(title=doc_title, chunk=chunk_text),
                }],
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("Contextual chunking failed (will use raw text): %s", exc)
            return ""


async def _contextualize_all(doc_title: str, chunk_texts: list[str]) -> list[str]:
    sem = asyncio.Semaphore(_CONTEXT_CONCURRENCY)
    return await asyncio.gather(*[_contextualize_chunk(doc_title, c, sem) for c in chunk_texts])


def _parse_pdf(file_path: str) -> list[dict]:
    pages: list[dict] = []
    with fitz.open(file_path) as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text()
            if text.strip():
                pages.append({"text": text, "metadata": {"page": page_num}})
    return pages


def _parse_docx(file_path: str) -> list[dict]:
    doc = DocxDocument(file_path)
    sections: list[dict] = []
    current_section = ""
    current_title = ""

    for para in doc.paragraphs:
        if para.style and para.style.name.startswith("Heading"):
            if current_section.strip():
                sections.append({
                    "text": current_section.strip(),
                    "metadata": {"section_title": current_title} if current_title else {},
                })
            current_section = ""
            current_title = para.text.strip()
        else:
            current_section += para.text + "\n"

    if current_section.strip():
        sections.append({
            "text": current_section.strip(),
            "metadata": {"section_title": current_title} if current_title else {},
        })

    return sections


def _parse_text(file_path: str) -> list[dict]:
    text = Path(file_path).read_text(encoding="utf-8")
    return [{"text": text, "metadata": {}}] if text.strip() else []


_PARSERS: dict[str, callable] = {
    "application/pdf": _parse_pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": _parse_docx,
    "text/plain": _parse_text,
    "text/markdown": _parse_text,
}


async def _split_sections(sections: list[dict]) -> list[dict]:
    if settings.semantic_chunking_enabled:
        return await _split_sections_semantic(sections)
    return _split_sections_recursive(sections)


def _split_sections_recursive(sections: list[dict]) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks: list[dict] = []
    for section in sections:
        texts = splitter.split_text(section["text"])
        for text in texts:
            chunks.append({"text": text, "metadata": dict(section["metadata"])})
    return chunks


def _split_into_sentences(text: str) -> list[str]:
    parts = _SENTENCE_SPLIT.split(text)
    return [p.strip() for p in parts if p and p.strip()]


def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _merge_short(chunk_texts: list[str]) -> list[str]:
    """Merge chunks shorter than _SEMANTIC_MIN_TOKENS into a neighbor."""
    if not chunk_texts:
        return []
    merged: list[str] = [chunk_texts[0]]
    for current in chunk_texts[1:]:
        if _approx_tokens(merged[-1]) < _SEMANTIC_MIN_TOKENS:
            merged[-1] = f"{merged[-1]} {current}"
        else:
            merged.append(current)
    # Tail chunk too short — fold into the previous one.
    if len(merged) > 1 and _approx_tokens(merged[-1]) < _SEMANTIC_MIN_TOKENS:
        tail = merged.pop()
        merged[-1] = f"{merged[-1]} {tail}"
    return merged


def _split_long(chunk_text: str) -> list[str]:
    """Recursively split a chunk that exceeds _SEMANTIC_MAX_TOKENS at the midpoint sentence."""
    if _approx_tokens(chunk_text) <= _SEMANTIC_MAX_TOKENS:
        return [chunk_text]
    sentences = _split_into_sentences(chunk_text)
    if len(sentences) <= 1:
        return [chunk_text]
    mid = len(sentences) // 2
    left = " ".join(sentences[:mid])
    right = " ".join(sentences[mid:])
    return _split_long(left) + _split_long(right)


async def _chunk_section_semantic(text_value: str) -> list[str]:
    sentences = _split_into_sentences(text_value)
    if len(sentences) <= _SEMANTIC_SENTENCE_WINDOW:
        return [text_value.strip()] if text_value.strip() else []

    n = len(sentences)
    groups = [
        " ".join(sentences[i : i + _SEMANTIC_SENTENCE_WINDOW])
        for i in range(n - _SEMANTIC_SENTENCE_WINDOW + 1)
    ]
    embeddings = await embed_texts(groups, input_type="passage")

    # Boundary at index i means sentence (i+2) starts a new chunk:
    # groups[i] spans sentences[i..i+2], groups[i+1] spans sentences[i+1..i+3].
    boundary_after_sentence: set[int] = set()
    for i in range(len(embeddings) - 1):
        if _cosine(embeddings[i], embeddings[i + 1]) < _SEMANTIC_SIM_THRESHOLD:
            boundary_after_sentence.add(i + _SEMANTIC_SENTENCE_WINDOW - 1)

    chunks: list[str] = []
    buffer: list[str] = []
    for idx, sentence in enumerate(sentences):
        buffer.append(sentence)
        if idx in boundary_after_sentence:
            chunks.append(" ".join(buffer))
            buffer = []
    if buffer:
        chunks.append(" ".join(buffer))

    chunks = _merge_short(chunks)
    result: list[str] = []
    for c in chunks:
        result.extend(_split_long(c))
    return result


async def _split_sections_semantic(sections: list[dict]) -> list[dict]:
    chunks: list[dict] = []
    for section in sections:
        section_chunks = await _chunk_section_semantic(section["text"])
        for chunk_text in section_chunks:
            chunks.append({"text": chunk_text, "metadata": dict(section["metadata"])})
    return chunks


async def process_document(document_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await _run_pipeline(db, document_id)
        except Exception as exc:
            logger.exception("Document processing failed: %s", document_id)
            await _set_failed(db, document_id, str(exc))


async def _run_pipeline(db: AsyncSession, document_id: uuid.UUID) -> None:
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one()

    document.status = "processing"
    await db.commit()

    parser = _PARSERS.get(document.content_type)
    if parser is None:
        raise ValueError(f"No parser for content type: {document.content_type}")

    sections = parser(document.file_path)
    if not sections:
        raise ValueError("Document produced no text content")

    chunk_dicts = await _split_sections(sections)
    if not chunk_dicts:
        raise ValueError("Chunking produced no chunks")

    # Contextual chunking: prepend an LLM-generated 2-3 sentence blurb explaining where
    # each chunk fits in the document. The contextualized text is embedded AND becomes
    # `chunks.content`; the raw chunk is preserved in `metadata["original_content"]` so
    # citations can show the user the original text without the "Context: ..." prefix.
    if settings.contextual_chunking_enabled:
        raw_texts = [c["text"] for c in chunk_dicts]
        contexts = await _contextualize_all(document.filename, raw_texts)
        for chunk_dict, ctx in zip(chunk_dicts, contexts):
            chunk_dict["metadata"] = {**chunk_dict["metadata"], "original_content": chunk_dict["text"]}
            if ctx:
                chunk_dict["text"] = f"Context: {ctx}\n\n{chunk_dict['text']}"
            # On failure (ctx == "") keep the raw text in chunks.content but still record
            # original_content for symmetry with successfully-contextualized chunks.

    texts = [c["text"] for c in chunk_dicts]
    vectors = await embed_texts(texts)

    chunks: list[Chunk] = []
    for idx, (chunk_dict, vector) in enumerate(zip(chunk_dicts, vectors)):
        chunk = Chunk(
            document_id=document_id,
            content=chunk_dict["text"],
            chunk_index=idx,
            chunk_metadata={**chunk_dict["metadata"], "chunk_index": idx},
        )
        db.add(chunk)
        chunks.append(chunk)

    await db.flush()

    for chunk, vector in zip(chunks, vectors):
        db.add(Embedding(
            chunk_id=chunk.id,
            model=embedding_model_name,
            vector=vector,
        ))

    await db.flush()

    await db.execute(
        text("UPDATE chunks SET fts_vector = to_tsvector('simple', content) WHERE document_id = :doc_id"),
        {"doc_id": document_id},
    )

    document.status = "ready"
    await db.commit()


async def _set_failed(db: AsyncSession, document_id: uuid.UUID, error: str) -> None:
    await db.rollback()
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if document is None:
        return

    file_path = Path(document.file_path)
    if file_path.exists():
        file_path.unlink()
        parent = file_path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    document.status = "failed"
    document.error_message = error[:2000]
    await db.commit()
