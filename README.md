# HEALTHCARE Monorepo

Healthcare is a healthcare platform with a NestJS backend, a FastAPI AI service, and a Flutter mobile client.

## Workspace

- backend: NestJS API
- ai: FastAPI face-recognition service
- apps/mobile: Flutter mobile app (Android/iOS)
- frontend/sos-web: separated SOS web frontend

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Swagger: http://localhost:3000/api-docs

### Backend via Docker

```bash
cd backend
docker compose up --build
```

Services started:

- Backend API: http://localhost:3000
- AI service: http://localhost:8001
- PostgreSQL: localhost:5432

Default seeded test account:

- Email: `test@healthcare.dev`
- Password: `Test@123456`

### AI Service

```bash
cd ai
python -m venv venv
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Docs: http://localhost:8001/docs

### Mobile App

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=HEALTHCARE_API_BASE_URL=http://10.0.2.2:3000
```

### SOS Web Prototype (Separated Web Dev)

```bash
cd frontend/sos-web
python -m http.server 5174
```

Open: http://localhost:5174

## Validation

```bash
cd backend && npm run build
cd apps/mobile && flutter analyze && flutter test && flutter build apk --debug
```

## Docs

- [backend/docs/API.md](backend/docs/API.md)
- [backend/README.md](backend/README.md)
- [apps/mobile/README.md](apps/mobile/README.md)
- [frontend/README.md](frontend/README.md)