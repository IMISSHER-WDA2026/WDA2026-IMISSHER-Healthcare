# Deploy Backend on Render + Supabase

This setup keeps backend persistence in Supabase Postgres and deploys API on Render.

## 1) Prepare Supabase

1. Create a Supabase project.
2. Open Settings -> Database.
3. Copy the Transaction Pooler connection string.
4. Ensure URL includes sslmode=require.

Example:

`postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`

## 2) Deploy Backend to Render (Docker)

### Option A: Render Blueprint

1. Connect repository to Render.
2. Create a Blueprint service using backend/render.yaml.
3. Set secret env vars in Render dashboard:
   - DATABASE_URL
   - JWT_SECRET

### Option B: Docker Image URL

1. Build and push image:

```bash
docker build -t ghcr.io/<your-org>/healthcare-backend:latest ./backend
docker push ghcr.io/<your-org>/healthcare-backend:latest
```

2. In Render: New -> Web Service -> Existing Image.
3. Image URL: ghcr.io/<your-org>/healthcare-backend:latest.
4. Add env vars listed below.

## 3) Backend Required Environment Variables

- NODE_ENV=production
- PORT=3000
- DATABASE_URL=<supabase pooler url>
- DB_SSL=true
- TYPEORM_SYNCHRONIZE=true
- JWT_SECRET=<strong-random-secret>
- JWT_EXPIRES_IN=7d
- CORS_ORIGIN=https://<your-web-domain>
- FACE_RECOGNITION_API_URL=https://<your-face-space>.hf.space/api/v1/face/recognize
- FACE_RECOGNITION_API_TOKEN=<optional>
- FACE_RECOGNITION_REQUEST_MODE=multipart
- FACE_RECOGNITION_MATCH_THRESHOLD=0.82
- RAG_MODEL_API_URL=https://<your-rag-space>.hf.space/api/v1/rag/answer
- RAG_MODEL_API_TOKEN=<optional>
- HEALTHCARE_TEST_ACCOUNT_EMAIL=test@healthcare.dev
- HEALTHCARE_TEST_ACCOUNT_PASSWORD=Test@123456
- HEALTHCARE_TEST_ACCOUNT_FULL_NAME=Tai Khoan Test Healthcare

## 4) Hugging Face Spaces Separation

Use two separate spaces:

1. Face recognition space for embeddings
2. RAG answering space for chatbot responses

Backend directly proxies to both spaces, so no dedicated AI proxy service is needed.

Recommended endpoint paths:

- Face: https://<your-face-space>.hf.space/api/v1/face/recognize
- RAG: https://<your-rag-space>.hf.space/api/v1/rag/answer

If your face space requires non-multipart input, change FACE_RECOGNITION_REQUEST_MODE to raw or json-base64.

## 5) SOS Frontend Hosting Decision

- Yes, frontend/sos-web is the web app to deploy.
- Vercel is the easiest option and already configured.
- Other static hosts also work (Netlify, Cloudflare Pages, S3 + CDN).

## 6) CORS and Mobile Localhost Clarification

- CORS only affects browser clients.
- Flutter mobile apps are not browser-origin restricted, so app-to-backend calls do not require CORS.
- For local Android emulator, use 10.0.2.2 to access host machine backend.
- For physical devices, use your LAN IP.
- You only need to host backend for mobile when you want external/public access beyond your local network.

## 7) Verify

1. Open https://<render-service>.onrender.com/api-docs.
2. Call POST /auth/login with seeded account.
3. Confirm data persists across service restarts.
4. Test POST /face-recognition/recognize with an image upload.

## 8) Mobile App Connection

Use Flutter dart define:

```bash
flutter run --dart-define=HEALTHCARE_API_BASE_URL=https://<render-service>.onrender.com
```
