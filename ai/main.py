import os
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

FACE_MODEL_NAME = os.getenv("FACE_MODEL_NAME", "Facenet512").strip() or "Facenet512"
FACE_ENFORCE_DETECTION = (
    os.getenv("FACE_ENFORCE_DETECTION", "false").strip().lower() == "true"
)
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))

app = FastAPI(
    title="Healthcare Face Recognition Model",
    description="Face embedding model service for Hugging Face Docker Space.",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_numeric_vector(candidate: Any) -> list[float] | None:
    if not isinstance(candidate, list) or not candidate:
        return None

    if isinstance(candidate[0], list):
        return _to_numeric_vector(candidate[0])

    result: list[float] = []
    try:
        for value in candidate:
            result.append(float(value))
    except (TypeError, ValueError):
        return None

    return result


def _extract_embedding(payload: Any) -> list[float]:
    candidates: list[Any] = []

    if isinstance(payload, list) and payload:
        candidates.append(payload)
        first = payload[0]
        if isinstance(first, dict):
            candidates.extend(
                [first.get("embedding"), first.get("vector"), first.get("embeddings")]
            )

    if isinstance(payload, dict):
        candidates.extend(
            [
                payload.get("embedding"),
                payload.get("vector"),
                payload.get("embeddings"),
            ]
        )

    for candidate in candidates:
        vector = _to_numeric_vector(candidate)
        if vector:
            return vector

    raise HTTPException(
        status_code=500,
        detail="Model output did not contain a valid embedding vector.",
    )


def _compute_embedding(image_bytes: bytes) -> list[float]:
    try:
        import cv2
        import numpy as np
        from deepface import DeepFace
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Model dependencies are missing from container image.",
        ) from exc

    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Unsupported image format.")

    try:
        output = DeepFace.represent(
            img_path=image,
            model_name=FACE_MODEL_NAME,
            enforce_detection=FACE_ENFORCE_DETECTION,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Face model inference failed: {exc}",
        ) from exc

    return _extract_embedding(output)


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "healthcare-face-space",
        "model": FACE_MODEL_NAME,
        "path": "/api/v1/face/recognize",
    }


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": FACE_MODEL_NAME,
        "enforceDetection": FACE_ENFORCE_DETECTION,
    }


@app.post("/api/v1/face/recognize")
async def recognize_face(file: UploadFile = File(...)) -> dict[str, Any]:
    content_type = (file.content_type or "").strip()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds maximum allowed size.")

    vector = _compute_embedding(image_bytes)

    return {
        "status": "success",
        "message": "Face embedding extracted.",
        "data": {
            "dimensions": len(vector),
            "vector": vector,
        },
    }
