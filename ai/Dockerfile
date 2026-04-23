FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Default is face-model dependencies for Hugging Face Docker Space.
ARG REQUIREMENTS_FILE=requirements.face.txt
ARG APP_MODULE=main:app

COPY ${REQUIREMENTS_FILE} /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

# Pre-download the Facenet512 model weights so the first API call doesn't time out.
RUN python - <<'EOF'
import numpy as np
try:
    from deepface import DeepFace
    dummy = np.zeros((160, 160, 3), dtype=np.uint8)
    DeepFace.represent(dummy, model_name="Facenet512", enforce_detection=False)
    print("Facenet512 weights cached successfully.")
except Exception as exc:
    print(f"Model pre-download skipped: {exc}")
EOF

RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 7860

CMD ["sh", "-c", "uvicorn ${APP_MODULE} --host 0.0.0.0 --port ${PORT:-7860}"]