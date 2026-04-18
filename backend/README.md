# IMISSHER Backend

NestJS API for authentication, user profile, SOS, medicines, chatbot, uploads, notifications, health metrics, and face-recognition proxy.

## Start

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Build and Test

```bash
npm run build
npm run test
```

## Docs

- Swagger: http://localhost:3000/api-docs
- API markdown: [docs/API.md](docs/API.md)

## Runtime Storage

Local JSON data is written to .runtime-data (disabled when NODE_ENV=test).

## Face Recognition Dependency

Set FACE_RECOGNITION_API_URL in .env to the AI service endpoint, default:
http://localhost:8001/api/v1/face/recognize