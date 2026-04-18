# IMISSHER Backend API

## Base

- Base URL: http://localhost:3000
- Swagger: http://localhost:3000/api-docs
- Auth: Bearer JWT for protected routes

## Endpoints

### Auth

- POST /auth/register
- POST /auth/login
- GET /auth/me

### Users

- GET /users/me
- PATCH /users/me

### Chatbot

- POST /chatbot/chat

### Medicines

- GET /medicines
- GET /medicines/barcode/:barcode
- POST /medicines
- GET /medicines/:id
- PATCH /medicines/:id
- DELETE /medicines/:id

### SOS

- POST /sos
- GET /sos
- GET /sos/active/:userId
- GET /sos/:id
- PATCH /sos/:id
- DELETE /sos/:id

### Health Metrics

- POST /health-metrics
- GET /health-metrics
- GET /health-metrics/summary/:userId
- GET /health-metrics/:id
- PATCH /health-metrics/:id
- DELETE /health-metrics/:id

### Face Recognition

- POST /face-recognition/recognize (multipart file)
- POST /face-recognition (imageBase64 or imageUrl)
- GET /face-recognition
- GET /face-recognition/:id
- PATCH /face-recognition/:id
- DELETE /face-recognition/:id

### Uploads

- POST /uploads (multipart file + metadata)
- GET /uploads
- GET /uploads/:id
- GET /uploads/:id/content
- PATCH /uploads/:id
- DELETE /uploads/:id

### Notifications

- POST /notifications
- GET /notifications
- GET /notifications/:id
- PATCH /notifications/:id
- PATCH /notifications/:id/read
- DELETE /notifications/:id

WebSocket events:
- Incoming: createNotification, findAllNotifications, findOneNotification, updateNotification, removeNotification, markNotificationRead
- Outgoing: notification.created, notification.updated, notification.removed

## Runtime Storage

In non-test mode, runtime JSON and uploads are stored under backend/.runtime-data.

## Environment Variables

- PORT
- JWT_SECRET
- JWT_EXPIRES_IN
- CORS_ORIGIN
- FACE_RECOGNITION_API_URL
- FACE_RECOGNITION_MATCH_THRESHOLD
- CHAT_MODEL_API_URL
- CHAT_MODEL_API_KEY
- IMISSHER_DATA_DIR
- IMISSHER_UPLOAD_DIR
