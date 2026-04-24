import 'package:flutter/material.dart';

import 'core/localization/app_strings.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_screen.dart';
import 'features/shell/main_shell.dart';

const String apiBaseUrl = String.fromEnvironment(
  'HEALTHCARE_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

void main() {
  runApp(const HealthcareApp());
}

class HealthcareApp extends StatefulWidget {
  const HealthcareApp({super.key});

  @override
  State<HealthcareApp> createState() => _HealthcareAppState();
}

class _HealthcareAppState extends State<HealthcareApp> {
  final ApiClient _apiClient = ApiClient(baseUrl: apiBaseUrl);
  AppLanguage _language = AppLanguage.vi;
  AuthSession? _session;

  void _toggleLanguage() {
    setState(() {
      _language =
          _language == AppLanguage.vi ? AppLanguage.en : AppLanguage.vi;
    });
  }

  void _setSession(AuthSession session) {
    setState(() => _session = session);
  }

  void _logout() {
    setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings(_language);

    return MaterialApp(
      title: strings.t('app.title'),
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      home: _session == null
          ? AuthScreen(
              strings: strings,
              apiClient: _apiClient,
              onLanguageToggle: _toggleLanguage,
              onAuthenticated: _setSession,
            )
          : MainShell(
              strings: strings,
              apiClient: _apiClient,
              session: _session!,
              onLogout: _logout,
              onLanguageToggle: _toggleLanguage,
              onSessionChanged: _setSession,
            ),
    );
  }
}
