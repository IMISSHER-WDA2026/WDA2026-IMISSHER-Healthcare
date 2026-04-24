from __future__ import annotations

import csv
import os
import re
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

RAG_MODEL_NAME = os.getenv("RAG_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert").strip()
RAG_TOP_K_DEFAULT = int(os.getenv("RAG_TOP_K_DEFAULT", "3"))
RAG_EMBEDDING_CACHE_ENV = os.getenv("RAG_EMBEDDING_CACHE_PATH", "").strip()
RAG_USE_LLM = os.getenv("RAG_USE_LLM", "true").lower() == "true"

app = FastAPI(
    title="Healthcare RAG Answering Model",
    description="RAG answering service for Hugging Face Docker Space.",
    version="1.0.0",
)


class RAGRequest(BaseModel):
    message: str = Field(min_length=1)
    topK: int | None = Field(default=None, ge=1, le=8)
    language: str | None = Field(default=None)  # 'vi' or 'en'


class RAGKnowledge(BaseModel):
    title: str
    content: str
    score: float


class RAGResponse(BaseModel):
    answer: str
    contexts: list[RAGKnowledge]
    source: str = "rag"


_knowledge_rows: list[dict[str, str]] = []
_embedding_matrix: np.ndarray | None = None
_encoder: Any = None
_llm_pipeline: Any = None


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


def _load_llm() -> None:
    global _llm_pipeline
    
    if not RAG_USE_LLM:
        return
    
    try:
        from transformers import pipeline
        # Use a lightweight text generation model
        _llm_pipeline = pipeline(
            "text2text-generation",
            model="google/flan-t5-small",
            device=-1,  # CPU, use device=0 for GPU
        )
    except Exception as e:
        print(f"Warning: Could not load LLM pipeline: {e}")
        _llm_pipeline = None


def _detect_language(text: str) -> str:
    """Detect if text is Vietnamese or English based on patterns."""
    # Simple heuristic: check for Vietnamese diacritics and common words
    vietnamese_patterns = [
        r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]',
        r'\b(là|được|có|cái|chiếc|qua|bạn|tôi|chúng|chúng tôi)\b',
    ]
    
    vietnamese_score = sum(1 for pattern in vietnamese_patterns if re.search(pattern, text, re.IGNORECASE))
    return 'vi' if vietnamese_score > 0 else 'en'


def _is_greeting(text: str) -> bool:
    """Check if the message is a greeting."""
    greetings_vi = ['xin chào', 'hello', 'chào', 'hii', 'hey', 'hi']
    greetings_en = ['hello', 'hi', 'hey', 'greetings', 'howdy']
    
    text_lower = text.lower().strip()
    return any(greeting in text_lower for greeting in greetings_vi + greetings_en)


def _generate_greeting_response(text: str, language: str | None = None) -> str:
    """Generate a greeting response."""
    if language is None:
        language = _detect_language(text)
    
    if language == 'vi':
        return "Xin chào! Tôi là trợ lý y tế. Có thể giúp bạn với câu hỏi gì không?"
    else:
        return "Hello! I'm a medical assistant. How can I help you with your medical questions?"


def _generate_llm_response(user_query: str, contexts: list[RAGKnowledge], language: str | None = None) -> str:
    """Generate a response using the LLM with retrieved context."""
    if not _llm_pipeline or not contexts:
        return _format_template_response(user_query, contexts, language)
    
    if language is None:
        language = _detect_language(user_query)
    
    # Build context string
    context_str = "\n".join([
        f"{i+1}. {item.title}: {item.content}" 
        for i, item in enumerate(contexts)
    ])
    
    # Create prompt for the LLM
    if language == 'vi':
        system_prompt = """Bạn là một trợ lý y tế hữu ích. 
Sử dụng thông tin dưới đây để trả lời câu hỏi của người dùng.
Nếu thông tin không đủ, hãy nói rõ rằng bạn không có đủ thông tin.
Luôn trả lời bằng Tiếng Việt với dấu thanh chính xác.
Nhắc nhở người dùng rằng bạn không thể thay thế lời khuyên của bác sĩ."""
        
        prompt = f"""{system_prompt}

Thông tin y tế có sẵn:
{context_str}

Câu hỏi của người dùng: {user_query}

Hãy trả lời câu hỏi dựa trên thông tin y tế được cung cấp ở trên."""
    else:
        system_prompt = """You are a helpful medical assistant.
Use the information below to answer the user's question.
If the information is not sufficient, clearly state that you don't have enough information.
Always respond in English.
Remind the user that you cannot replace medical advice from a doctor."""
        
        prompt = f"""{system_prompt}

Available medical information:
{context_str}

User question: {user_query}

Please answer the question based on the medical information provided above."""
    
    try:
        result = _llm_pipeline(prompt, max_length=512, min_length=50, do_sample=False)
        return result[0]['generated_text'] if result else _format_template_response(user_query, contexts, language)
    except Exception as e:
        print(f"Error in LLM generation: {e}")
        return _format_template_response(user_query, contexts, language)


def _format_template_response(user_query: str, contexts: list[RAGKnowledge], language: str | None = None) -> str:
    """Format a template-based response when LLM is not available."""
    if language is None:
        language = _detect_language(user_query)
    
    summary_lines = [
        f"{i + 1}. {item.title}: {item.content}" for i, item in enumerate(contexts)
    ]
    
    if language == 'vi':
        answer_text = (
            f"Thông tin tham khảo cho câu hỏi: \"{user_query}\":\n\n" +
            "\n".join(summary_lines) +
            "\n\nLưu ý: Đây là thông tin tham khảo, không thay thế chẩn đoán bác sĩ. "
            "Vui lòng liên hệ với bác sĩ để được tư vấn chuyên môn."
        )
    else:
        answer_text = (
            f"Reference information for your question: \"{user_query}\":\n\n" +
            "\n".join(summary_lines) +
            "\n\nNote: This is reference information, not a medical diagnosis. "
            "Please consult a doctor for professional medical advice."
        )
    
    return answer_text


@app.on_event("startup")
def startup() -> None:
    _load_knowledge_base()
    _load_encoder_and_embeddings()
    _load_llm()


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": RAG_MODEL_NAME,
        "knowledgeSize": len(_knowledge_rows),
        "llmEnabled": _llm_pipeline is not None,
    }


@app.post("/api/v1/rag/answer", response_model=RAGResponse)
def answer(request: RAGRequest) -> RAGResponse:
    if _encoder is None or _embedding_matrix is None or len(_knowledge_rows) == 0:
        if request.language == 'vi' or _detect_language(request.message) == 'vi':
            error_msg = "Không tìm thấy tri thức nội bộ. Vui lòng cập nhật dữ liệu căm nang sơ cứu trước khi sử dụng RAG answering service."
        else:
            error_msg = "No internal knowledge found. Please update first aid knowledge data before using RAG answering service."
        
        return RAGResponse(
            answer=error_msg,
            contexts=[],
            source="error",
        )

    # Detect language if not provided
    language = request.language or _detect_language(request.message)
    
    # Handle greetings
    if _is_greeting(request.message):
        return RAGResponse(
            answer=_generate_greeting_response(request.message, language),
            contexts=[],
            source="greeting",
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

    # Generate response using LLM if available, otherwise use template
    answer_text = _generate_llm_response(request.message, contexts, language)

    return RAGResponse(answer=answer_text, contexts=contexts, source="llm" if _llm_pipeline else "template")
