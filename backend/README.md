# IMISSHER Backend

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

- `imissher_backend` at http://localhost:3000
- `imissher_ai` at http://localhost:8001
- `imissher_postgres` at localhost:5432

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
- Render + Supabase deploy guide: [docs/DEPLOY_RENDER_SUPABASE.md](docs/DEPLOY_RENDER_SUPABASE.md)

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

- Email: `test@imissher.dev`
- Password: `Test@123456`

You can override these values using:

- `IMISSHER_TEST_ACCOUNT_EMAIL`
- `IMISSHER_TEST_ACCOUNT_PASSWORD`
- `IMISSHER_TEST_ACCOUNT_FULL_NAME`

## Face Recognition Dependency

Set FACE_RECOGNITION_API_URL in .env to the AI service endpoint, default:
http://localhost:8001/api/v1/face/recognize