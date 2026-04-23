# Healthcare Backend

NestJS API for authentication, user profile, SOS, medicines, chatbot, uploads, notifications, health metrics, and face-recognition proxy.

## Start

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Docker (Backend + AI + Local Postgres)

```bash
docker compose up --build
```

This starts:

- `healthcare_backend` at http://localhost:3000
- `healthcare_ai` at http://localhost:8001
- `healthcare_postgres` at localhost:5432

Backend core data (auth, SOS, custom medicines) is persisted in PostgreSQL.
Runtime JSON is still used by non-critical modules that have not been migrated yet.

To stop:

```bash
docker compose down
```

## Build and Test

```bash
npm run build
npm run test
```

## Docs

- Swagger: http://localhost:3000/api-docs
- API markdown: [docs/API.md](docs/API.md)
- Standardized production deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Database and Environment

Main variables:

- `DATABASE_URL` (Supabase Postgres or local Postgres)
- `DB_SSL` (`true` for Supabase)
- `TYPEORM_SYNCHRONIZE` (`true` for first deployment)
- `PORT`
- `JWT_SECRET`
- `CORS_ORIGIN`

See [.env.example](.env.example) for full list.

## Seeded Test Account

At startup, backend auto-creates a test account if it does not exist yet:

- Email: `test@healthcare.dev`
- Password: `Test@123456`

You can override these values using:

- `HEALTHCARE_TEST_ACCOUNT_EMAIL`
- `HEALTHCARE_TEST_ACCOUNT_PASSWORD`
- `HEALTHCARE_TEST_ACCOUNT_FULL_NAME`

## Face Recognition Dependency

Set FACE_RECOGNITION_API_URL in .env to the AI service endpoint, default:
http://localhost:8001/api/v1/face/recognize

## Direct Hugging Face Spaces Integration

Use two separate Hugging Face Spaces:

1. Face recognition space
2. RAG answering space

Recommended environment mapping:

- FACE_RECOGNITION_API_URL=https://<your-face-space>.hf.space/api/v1/face/recognize
- FACE_RECOGNITION_API_TOKEN=<optional>
- FACE_RECOGNITION_REQUEST_MODE=multipart
- RAG_MODEL_API_URL=https://<your-rag-space>.hf.space/api/v1/rag/answer
- RAG_MODEL_API_TOKEN=<optional>

Backend now handles proxying requests to both spaces directly, so no separate AI proxy service is required in production.