"""Background worker: parse file → split into chunks → generate embeddings → save to DB → set status ready."""

import logging
import uuid
from pathlib import Path

import fitz
from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import AsyncSessionLocal
from src.documents.models import Chunk, Document, Embedding, EMBEDDING_DIM

logger = logging.getLogger(__name__)

EMBEDDING_BATCH_SIZE = 2048

_openai = AsyncOpenAI(api_key=settings.openai_api_key)


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


def _split_sections(sections: list[dict]) -> list[dict]:
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


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    all_vectors: list[list[float]] = []
    for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[i : i + EMBEDDING_BATCH_SIZE]
        response = await _openai.embeddings.create(
            input=batch,
            model=settings.embedding_model,
        )
        all_vectors.extend([item.embedding for item in response.data])
    return all_vectors


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

    chunk_dicts = _split_sections(sections)
    if not chunk_dicts:
        raise ValueError("Chunking produced no chunks")

    texts = [c["text"] for c in chunk_dicts]
    vectors = await _embed_texts(texts)

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
            model=settings.embedding_model,
            vector=vector,
        ))

    document.status = "ready"
    await db.commit()


async def _set_failed(db: AsyncSession, document_id: uuid.UUID, error: str) -> None:
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if document is not None:
        document.status = "failed"
        document.error_message = error[:2000]
        await db.commit()
