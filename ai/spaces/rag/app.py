from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

RAG_MODEL_NAME = os.getenv("RAG_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert").strip()
RAG_TOP_K_DEFAULT = int(os.getenv("RAG_TOP_K_DEFAULT", "3"))
RAG_EMBEDDING_CACHE_ENV = os.getenv("RAG_EMBEDDING_CACHE_PATH", "").strip()

app = FastAPI(
    title="Healthcare RAG Answering Model",
    description="RAG answering service for Hugging Face Docker Space.",
    version="1.0.0",
)


class RAGRequest(BaseModel):
    message: str = Field(min_length=1)
    topK: int | None = Field(default=None, ge=1, le=8)


class RAGKnowledge(BaseModel):
    title: str
    content: str
    score: float


class RAGResponse(BaseModel):
    answer: str
    contexts: list[RAGKnowledge]


_knowledge_rows: list[dict[str, str]] = []
_embedding_matrix: np.ndarray | None = None
_encoder: Any = None


def _resolve_data_file() -> Path | None:
    candidates = [
        Path("/app/data/first_aid_knowledge.csv"),
        Path(__file__).resolve().parent / "data" / "first_aid_knowledge.csv",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def _resolve_embedding_cache_path(data_file: Path) -> Path:
    if RAG_EMBEDDING_CACHE_ENV:
        return Path(RAG_EMBEDDING_CACHE_ENV)
    return data_file.with_suffix(".embeddings.npy")


def _load_knowledge_base() -> None:
    global _knowledge_rows

    data_file = _resolve_data_file()
    if not data_file:
        _knowledge_rows = []
        return

    rows: list[dict[str, str]] = []
    with data_file.open("r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp, delimiter=";")
        for row in reader:
            title = (row.get("title") or "").strip()
            content = (row.get("content") or "").strip()
            if not title or not content:
                continue
            rows.append({"title": title, "content": content})

    _knowledge_rows = rows


def _load_encoder_and_embeddings() -> None:
    global _encoder
    global _embedding_matrix

    if not _knowledge_rows:
        _embedding_matrix = np.zeros((0, 1), dtype=np.float32)
        return

    from sentence_transformers import SentenceTransformer

    _encoder = SentenceTransformer(RAG_MODEL_NAME)

    data_file = _resolve_data_file()
    cache_path = _resolve_embedding_cache_path(data_file) if data_file else None

    if cache_path and cache_path.exists():
        try:
            cached = np.load(cache_path)
            if cached.shape[0] == len(_knowledge_rows):
                _embedding_matrix = cached.astype(np.float32, copy=False)
                return
        except (OSError, ValueError):
            pass

    corpus = [f"{row['title']}\n{row['content']}" for row in _knowledge_rows]
    embeddings = _encoder.encode(corpus, normalize_embeddings=True)
    _embedding_matrix = np.asarray(embeddings, dtype=np.float32)

    if cache_path is not None:
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            np.save(cache_path, _embedding_matrix)
        except OSError:
            pass


@app.on_event("startup")
def startup() -> None:
    _load_knowledge_base()
    _load_encoder_and_embeddings()


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": RAG_MODEL_NAME,
        "knowledgeSize": len(_knowledge_rows),
    }


@app.post("/api/v1/rag/answer", response_model=RAGResponse)
def answer(request: RAGRequest) -> RAGResponse:
    if _encoder is None or _embedding_matrix is None or len(_knowledge_rows) == 0:
        return RAGResponse(
            answer=(
                "Khong tim thay tri thuc noi bo. Vui long cap nhat du lieu cam nang so cuu "
                "truoc khi su dung RAG answering space."
            ),
            contexts=[],
        )

    top_k = request.topK or RAG_TOP_K_DEFAULT
    top_k = max(1, min(top_k, 8))

    query_vector = _encoder.encode([request.message], normalize_embeddings=True)
    query = np.asarray(query_vector[0], dtype=np.float32)

    scores = _embedding_matrix @ query
    candidate_indexes = np.argsort(scores)[::-1][:top_k]

    contexts: list[RAGKnowledge] = []
    for idx in candidate_indexes:
        row = _knowledge_rows[int(idx)]
        contexts.append(
            RAGKnowledge(
                title=row["title"],
                content=row["content"],
                score=float(scores[int(idx)]),
            )
        )

    summary_lines = [
        f"{i + 1}. {item.title}: {item.content}" for i, item in enumerate(contexts)
    ]
    answer_text = (
        f"Huong dan tham khao cho cau hoi: '{request.message}'.\n"
        + "\n".join(summary_lines)
        + "\n\nLuu y: Day la thong tin tham khao, khong thay the chan doan bac si."
    )

    return RAGResponse(answer=answer_text, contexts=contexts)
