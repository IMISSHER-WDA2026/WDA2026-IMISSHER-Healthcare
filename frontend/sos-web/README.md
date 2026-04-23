# SOS Web (TypeScript + Vite)

## Local Development

```bash
cd frontend/sos-web
npm install
echo VITE_API_BASE_URL=http://localhost:3000> .env.local
npm run dev
```

Default URL: `http://localhost:5174`

The app will read `VITE_API_BASE_URL` and pre-fill API Base URL in the UI.

## Production Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel (recommended)

1. Import `frontend/sos-web` as a separate project in Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set env var `VITE_API_BASE_URL=https://<your-backend-domain>`.
5. After deploy, set backend `CORS_ORIGIN` with your Vercel domain.
