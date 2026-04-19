# Deploy Backend on Render + Supabase

This setup keeps Render on the free web tier while using Supabase Postgres for persistent data.

## 1) Prepare Supabase

1. Create a Supabase project.
2. Open `Settings -> Database`.
3. Copy the `Transaction Pooler` connection string.
4. Ensure the URL contains `sslmode=require`.

Example:

`postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`

## 2) Deploy Backend to Render (Docker)

### Option A: Render Blueprint

1. Connect repository to Render.
2. Create a `Blueprint` service using `backend/render.yaml`.
3. Set secret env vars in Render dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`

### Option B: Docker Image URL (manual)

1. Build and push image:

```bash
docker build -t ghcr.io/<your-org>/imissher-backend:latest ./backend
docker push ghcr.io/<your-org>/imissher-backend:latest
```

2. In Render: `New -> Web Service -> Existing Image`.
3. Image URL: `ghcr.io/<your-org>/imissher-backend:latest`.
4. Add env vars listed below.

## 3) Required Render Environment Variables

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=<supabase pooler url>`
- `DB_SSL=true`
- `TYPEORM_SYNCHRONIZE=true`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `CORS_ORIGIN=https://<your-vercel-app>.vercel.app`
- `FACE_RECOGNITION_API_URL=<public-ai-endpoint>`
- `FACE_RECOGNITION_MATCH_THRESHOLD=0.82`
- `IMISSHER_TEST_ACCOUNT_EMAIL=test@imissher.dev`
- `IMISSHER_TEST_ACCOUNT_PASSWORD=Test@123456`
- `IMISSHER_TEST_ACCOUNT_FULL_NAME=Tai Khoan Test IMISSHER`

## 4) Verify

After deploy:

1. Open `https://<render-service>.onrender.com/api-docs`.
2. Call `POST /auth/login` with seeded account.
3. Confirm data persists across service restarts.

## 5) Mobile App Connection

Use Flutter dart define:

```bash
flutter run --dart-define=IMISSHER_API_BASE_URL=https://<render-service>.onrender.com
```
