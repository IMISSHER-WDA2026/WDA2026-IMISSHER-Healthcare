# Frontend Workspace

## Structure

- `frontend/sos-web`: SOS web console built with TypeScript + Vite.

## SOS Web (TypeScript)

```bash
cd frontend/sos-web
npm install
npm run dev
```

Open: `http://localhost:5174`

Default backend API base URL: `http://localhost:3000`

## Deploy SOS Web

Recommended hosting: Vercel.

1. Import `frontend/sos-web` as a Vercel project.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Put deployed domain into backend `CORS_ORIGIN`.
