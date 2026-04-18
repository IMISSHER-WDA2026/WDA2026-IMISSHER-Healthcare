# IMISSHER AI Service

FastAPI service for face embedding extraction (DeepFace Facenet512).

## Run

```bash
python -m venv venv
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Docs: http://localhost:8001/docs

## Endpoint

POST /api/v1/face/recognize
- Input: multipart/form-data with image file
- Output: embedding vector and metadata

## Backend Link

Backend reads FACE_RECOGNITION_API_URL to call this service.