# Healthcare AI Services (Hugging Face Spaces)

This folder now supports two separate AI spaces:

1. Face recognition model space
2. RAG answering model space

## 1) Face Recognition Space

Use one of these options:

- Root package: `ai/` (main.py + Dockerfile + requirements.face.txt)
- Dedicated package: `ai/spaces/face/`

Endpoint contract:

- POST /api/v1/face/recognize
- Input: multipart/form-data with `file`
- Output: `data.vector` embedding array

## 2) RAG Answering Space

Use package:

- `ai/spaces/rag/`

Endpoint contract:

- POST /api/v1/rag/answer
- Input: `{ "message": "...", "topK": 3 }`
- Output: `answer` + `contexts`

## 3) Deploy to Hugging Face Docker Spaces

Create two Hugging Face Spaces (SDK: Docker):

1. healthcare-face-space
2. healthcare-rag-space

For each space:

1. Push the corresponding folder contents to the Space repository root.
2. Ensure `Dockerfile` is at repository root for that Space.
3. Set runtime variables if needed:
   - Face: `FACE_MODEL_NAME`, `FACE_ENFORCE_DETECTION`
   - RAG: `RAG_EMBEDDING_MODEL`, `RAG_TOP_K_DEFAULT`

## 4) Backend Integration

After deployment, wire backend directly:

- FACE_RECOGNITION_API_URL=https://<face-space>.hf.space/api/v1/face/recognize
- RAG_MODEL_API_URL=https://<rag-space>.hf.space/api/v1/rag/answer

No separate AI proxy service is required in production.