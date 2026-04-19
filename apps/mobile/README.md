# IMISSHER Mobile

Flutter client for Android and iOS.

## Requirements

- Flutter 3.41.6+
- Android SDK and/or Xcode
- Running backend API at http://localhost:3000

## Run

```bash
flutter pub get
flutter run --dart-define=IMISSHER_API_BASE_URL=http://10.0.2.2:3000
```

Use 10.0.2.2 for Android emulator, or your LAN IP for a physical device.

## Validate

```bash
flutter analyze
flutter test
flutter build apk --debug --dart-define=IMISSHER_API_BASE_URL=http://10.0.2.2:3000
```

## Scope

- Auth (register/login)
- Profile and medical info updates
- SOS trigger flow
- Medicine lookup/list + add custom medicine
- Chatbot integration
- Vietnamese/English UI with refreshed visual design
