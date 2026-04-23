# Production Deployment Guide (Standardized)

This document defines one deployment contract for:

1. Local deployment
2. Production deployment

The contract is env-var driven, so each component uses the same variable names in local and production.

## 1) Standardized Deployment Topology

Recommended production topology:

1. Backend API: Render web service from backend/
2. Database: Supabase Postgres
3. AI Face model: Hugging Face Docker Space
4. AI RAG model: Hugging Face Docker Space
5. SOS web: Vercel project from frontend/sos-web/
6. Mobile app: Flutter build with production API base URL

Recommended local topology:

1. backend/docker-compose.yml for backend + AI + Postgres
2. frontend/sos-web with Vite dev server
3. apps/mobile with --dart-define pointing to local/LAN backend

## 2) Unified Environment Variable Contract

Use these variables consistently in local (.env) and production (provider env settings).

| Variable | Local Typical Value | Production Requirement |
| --- | --- | --- |
| NODE_ENV | development | Must be production |
| PORT | 3000 | Provider port (Render uses 3000 by config) |
| DATABASE_URL | local Postgres URL | Required, managed Postgres URL |
| DB_SSL | false | true for Supabase/managed Postgres |
| TYPEORM_SYNCHRONIZE | true | true for first bootstrap, then false after schema stabilizes |
| JWT_SECRET | strong local secret | Required, at least 32 chars, never default |
| JWT_EXPIRES_IN | 7d | Set by policy |
| CORS_ORIGIN | empty or localhost list | Required explicit origins (wildcard blocked in production) |
| ENABLE_SWAGGER | true (optional) | false recommended (or true only if you need public docs) |
| FACE_RECOGNITION_API_URL | local AI URL | Required if using external AI space |
| FACE_RECOGNITION_API_TOKEN | empty | Optional secret token |
| FACE_RECOGNITION_REQUEST_MODE | multipart | multipart/raw/json-base64 based on AI endpoint |
| FACE_RECOGNITION_TIMEOUT_MS | 45000 | Optional tuning |
| FACE_RECOGNITION_MATCH_THRESHOLD | 0.82 | Optional tuning |
| RAG_MODEL_API_URL | empty or local/proxy URL | Recommended for cloud RAG |
| RAG_MODEL_API_TOKEN | empty | Optional secret token |
| RAG_MODEL_TIMEOUT_MS | 45000 | Optional tuning |
| HEALTHCARE_TEST_ACCOUNT_EMAIL | test@healthcare.dev | Optional override |
| HEALTHCARE_TEST_ACCOUNT_PASSWORD | Test@123456 | Optional override |
| HEALTHCARE_TEST_ACCOUNT_FULL_NAME | Tai Khoan Test Healthcare | Optional override |

Notes:

1. In production, backend startup fails if JWT_SECRET is weak/missing, DATABASE_URL is missing, or CORS_ORIGIN is wildcard.
2. Keep secrets in provider secret managers, not in git.

## 3) Local Deployment (Parity Workflow)

### 3.1 Backend + AI + Postgres via Docker

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Expected local endpoints:

1. Backend: http://localhost:3000
2. AI face service: http://localhost:8001
3. Swagger (if enabled by env): http://localhost:3000/api-docs

Local health check:

```bash
curl http://localhost:3000/health
```

PowerShell equivalent:

```powershell
Invoke-WebRequest http://localhost:3000/health | Select-Object -ExpandProperty Content
```

Expected response:

```json
{"status":"ok","uptime":0.123,"environment":"development"}
```

### 3.2 SOS Web Local

```bash
cd frontend/sos-web
npm install
echo VITE_API_BASE_URL=http://localhost:3000> .env.local
npm run dev
```

### 3.3 Mobile Local

Android emulator:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=HEALTHCARE_API_BASE_URL=http://10.0.2.2:3000
```

Physical device:

```bash
flutter run --dart-define=HEALTHCARE_API_BASE_URL=http://<your-lan-ip>:3000
```

## 4) Production Deployment Runbook

### 4.1 Provision Supabase Postgres

1. Create project in Supabase.
2. Open Settings -> Database.
3. Copy Transaction Pooler URI.
4. Ensure URI includes sslmode=require.

Example:

postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require

### 4.2 Deploy AI Spaces (Face + RAG)

1. Create two Hugging Face Docker Spaces.
2. Deploy face package from ai/spaces/face.
3. Deploy rag package from ai/spaces/rag.
4. Record public URLs:
   - FACE_RECOGNITION_API_URL=https://<face-space>.hf.space/api/v1/face/recognize
   - RAG_MODEL_API_URL=https://<rag-space>.hf.space/api/v1/rag/answer

### 4.3 Deploy Backend on Render

Recommended method (Blueprint):

1. Connect repository to Render.
2. Create service from backend/render.yaml.
3. Set required secrets in Render dashboard:
   - DATABASE_URL
   - JWT_SECRET
   - FACE_RECOGNITION_API_URL
   - RAG_MODEL_API_URL
4. Set production-safe values:
   - NODE_ENV=production
   - DB_SSL=true
   - CORS_ORIGIN=https://<your-sos-domain>
   - ENABLE_SWAGGER=false

Production health check:

```bash
curl https://<your-backend-domain>/health
```

PowerShell equivalent:

```powershell
Invoke-WebRequest https://<your-backend-domain>/health | Select-Object -ExpandProperty Content
```

Use Render healthCheckPath = /health.

Optional image method:

```bash
docker build -t ghcr.io/<your-org>/healthcare-backend:latest ./backend
docker push ghcr.io/<your-org>/healthcare-backend:latest
```

Then create Render Web Service from existing image and apply the same env vars.

### 4.4 Deploy SOS Web on Vercel

1. Import frontend/sos-web as a separate Vercel project.
2. Build command: npm run build
3. Output directory: dist
4. Add env var in Vercel:
   - VITE_API_BASE_URL=https://<your-backend-domain>
5. Redeploy and confirm browser calls hit production backend.

### 4.5 Build Mobile for Production Backend

```bash
cd apps/mobile
flutter build apk --release --dart-define=HEALTHCARE_API_BASE_URL=https://<your-backend-domain>
```

For iOS release, pass the same --dart-define value during archive/build.

## 5) Go-Live Verification Checklist

1. GET / returns 200 from backend root.
2. Auth login works with seeded or real account.
3. Create and list SOS incidents successfully.
4. Face recognition endpoint works with real image.
5. Chatbot response works through RAG model URL.
6. Browser calls pass CORS only from allowed origins.
7. Restart backend service and verify data persistence.

## 6) Common Production Failure Modes

1. Render health check fails:
   - Use health path / (not /api-docs, because Swagger is usually disabled in production).
2. Backend crashes on boot in production:
   - Verify JWT_SECRET length >= 32 and DATABASE_URL is set.
3. CORS error in browser:
   - Set exact CORS_ORIGIN domain list, comma-separated.
4. Database connection errors:
   - Ensure sslmode=require in DATABASE_URL and DB_SSL=true.
5. AI timeout/failure:
   - Validate FACE_RECOGNITION_* and RAG_MODEL_* URLs/tokens/timeouts.

## 7) Operational Recommendations

1. Rotate JWT and AI tokens on a schedule.
2. Keep TYPEORM_SYNCHRONIZE=true only while schema is evolving without migrations.
3. Add monitoring/alerts for backend availability and AI upstream failures.
4. Keep provider secrets and environment configuration versioned in internal runbooks.

## 8) Ready-To-Use Template Files

Use these files as the starting point for local and production setup:

1. [backend/.env.example](../.env.example)
2. [backend/.env.production.example](../.env.production.example)
3. [frontend/sos-web/.env.local.example](../../frontend/sos-web/.env.local.example)
4. [frontend/sos-web/.env.production.example](../../frontend/sos-web/.env.production.example)

Recommended usage:

1. Copy backend/.env.example to backend/.env for local Docker runs.
2. Use backend/.env.production.example as the checklist for Render, Supabase, and any secret manager.
3. Set frontend/sos-web/.env.local for local Vite dev and frontend/sos-web/.env.production.example for Vercel.
