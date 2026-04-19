# SOS Web (TypeScript + Vite)

## Local Development

```bash
cd frontend/sos-web
npm install
npm run dev
```

Default URL: `http://localhost:5174`

## Production Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel (recommended)

1. Import `frontend/sos-web` as a separate project in Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. After deploy, set backend CORS with your Vercel domain.
