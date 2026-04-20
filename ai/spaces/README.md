# Hugging Face Spaces Packages

This folder contains two independent Docker Space packages:

- face/: Face embedding model service
- rag/: RAG answering service

Deploy each package to its own Hugging Face Space by copying that package content to the Space repository root.

Recommended backend mapping:

- FACE_RECOGNITION_API_URL -> https://<face-space>.hf.space/api/v1/face/recognize
- RAG_MODEL_API_URL -> https://<rag-space>.hf.space/api/v1/rag/answer
