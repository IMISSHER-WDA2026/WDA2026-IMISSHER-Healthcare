import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'core/localization/app_strings.dart';
import 'core/network/api_client.dart';

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
      _language = _language == AppLanguage.vi ? AppLanguage.en : AppLanguage.vi;
    });
  }

  void _setSession(AuthSession session) {
    setState(() {
      _session = session;
    });
  }

  void _logout() {
    setState(() {
      _session = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings(_language);
    final textTheme = GoogleFonts.plusJakartaSansTextTheme();

    return MaterialApp(
      title: strings.t('app.title'),
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        textTheme: textTheme,
        colorScheme:
            ColorScheme.fromSeed(
              seedColor: const Color(0xFFE11E2B),
              brightness: Brightness.light,
            ).copyWith(
              primary: const Color(0xFFE11E2B),
              secondary: const Color(0xFF0D5C7A),
              surface: Colors.white,
            ),
        scaffoldBackgroundColor: const Color(0xFFCFE6F2),
        appBarTheme: AppBarTheme(
          backgroundColor: const Color(0xFFCFE6F2),
          foregroundColor: Colors.black,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          titleTextStyle: textTheme.titleLarge?.copyWith(
            color: Colors.black,
            fontWeight: FontWeight.w800,
          ),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          margin: EdgeInsets.zero,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
            side: BorderSide(color: Color(0xFFD3DDE3)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
          hintStyle: const TextStyle(color: Color(0xFF6B7280)),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFC2CCD4)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFC2CCD4)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE11E2B), width: 1.5),
          ),
        ),
      ),
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

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.onAuthenticated,
    required this.onLanguageToggle,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final ValueChanged<AuthSession> onAuthenticated;
  final VoidCallback onLanguageToggle;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _fullNameController = TextEditingController();

  bool _isRegister = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();
      final fullName = _fullNameController.text.trim();

      late AuthSession session;
      if (_isRegister) {
        session = await widget.apiClient.register(
          email: email,
          password: password,
          fullName: fullName,
        );
      } else {
        session = await widget.apiClient.login(
          email: email,
          password: password,
        );
      }

      if (!mounted) {
        return;
      }

      widget.onAuthenticated(session);
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      // Map backend error messages to localized keys
      String localizedError = error.message;
      final errorMsg = error.message.toLowerCase();
      
      if (errorMsg.contains('invalid') && errorMsg.contains('credential')) {
        localizedError = widget.strings.t('errors.invalidCredentials');
      } else if (errorMsg.contains('not found') || errorMsg.contains('does not exist')) {
        localizedError = widget.strings.t('errors.userNotFound');
      } else if (errorMsg.contains('already') && errorMsg.contains('exist')) {
        localizedError = widget.strings.t('errors.emailExists');
      } else if (errorMsg.contains('unauthorized')) {
        localizedError = widget.strings.t('errors.unauthorized');
      } else if (errorMsg.contains('server') || errorMsg.contains('internal')) {
        localizedError = widget.strings.t('errors.serverError');
      }

      setState(() {
        _error = localizedError;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = widget.strings.t('common.error');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: widget.onLanguageToggle,
                      icon: const Icon(Icons.language, size: 18),
                      label: Text(strings.t('language.toggle')),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Image.asset(
                      'assets/design/healthcare_logo.png',
                      height: 72,
                      errorBuilder: (_, error, stackTrace) => Text(
                        'HEALTHCARE',
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    _isRegister
                        ? strings.t('auth.register')
                        : strings.t('auth.login'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    strings.t('auth.subtitle'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: _emailController,
                    decoration: InputDecoration(
                      hintText: strings.t('auth.emailHint'),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _passwordController,
                    decoration: InputDecoration(
                      hintText: strings.t('auth.passwordHint'),
                    ),
                    obscureText: true,
                    textInputAction: _isRegister
                        ? TextInputAction.next
                        : TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                  ),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: _isRegister
                        ? Padding(
                            key: const ValueKey<String>('register-name'),
                            padding: const EdgeInsets.only(top: 10),
                            child: TextField(
                              controller: _fullNameController,
                              decoration: InputDecoration(
                                hintText: strings.t('auth.fullNameHint'),
                              ),
                              textInputAction: TextInputAction.done,
                              autofillHints: const [AutofillHints.name],
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEBEE),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFFCDD2)),
                      ),
                      child: Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFFB71C1C),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(strings.t('auth.continue')),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.center,
                    child: TextButton(
                      onPressed: () {
                        setState(() {
                          _isRegister = !_isRegister;
                          _error = null;
                        });
                      },
                      child: Text(
                        _isRegister
                            ? strings.t('auth.switchToLogin')
                            : strings.t('auth.switchToRegister'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: Container(
                      width: 240,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE11E2B),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'SOS',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    strings.t('auth.sosHint'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF1F2937),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0D5C7A),
        foregroundColor: Colors.white,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => _QuickScanScreen(strings: widget.strings),
            ),
          );
        },
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: Text(widget.strings.t('quickScan.title')),
      ),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
    required this.onLogout,
    required this.onLanguageToggle,
    required this.onSessionChanged,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;
  final VoidCallback onLogout;
  final VoidCallback onLanguageToggle;
  final ValueChanged<AuthSession> onSessionChanged;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedTab = 0;

  Future<void> _openMedicalInfo() async {
    final updatedSession = await Navigator.of(context).push<AuthSession>(
      MaterialPageRoute(
        builder: (_) => MedicalInfoScreen(
          strings: widget.strings,
          apiClient: widget.apiClient,
          session: widget.session,
        ),
      ),
    );

    if (updatedSession != null) {
      widget.onSessionChanged(updatedSession);
    }
  }

  @override
  Widget build(BuildContext context) {
    final labels = [
      widget.strings.t('tabs.home'),
      widget.strings.t('tabs.sos'),
      widget.strings.t('tabs.scanner'),
      widget.strings.t('tabs.medicines'),
      widget.strings.t('tabs.chatbot'),
    ];

    // Use special title for medicines shell
    final appBarTitle = _selectedTab == 3
        ? widget.strings.t('medicines.shellTitle')
        : labels[_selectedTab];

    final pages = [
      HomeScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
        onOpenMedicalInfo: _openMedicalInfo,
        onOpenSos: () {
          setState(() {
            _selectedTab = 1;
          });
        },
        onOpenMedicines: () {
          setState(() {
            _selectedTab = 3;
          });
        },
      ),
      SosScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
      ),
      ScannerScreen(strings: widget.strings, apiClient: widget.apiClient, session: widget.session),
      MedicinesScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
      ),
      ChatbotScreen(strings: widget.strings, apiClient: widget.apiClient),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(appBarTitle),
        actions: [
          TextButton.icon(
            onPressed: widget.onLanguageToggle,
            icon: const Icon(Icons.language, size: 18),
            label: Text(widget.strings.t('language.toggle')),
          ),
          IconButton(
            tooltip: widget.strings.t('auth.logout'),
            icon: const Icon(Icons.logout_rounded),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(index: _selectedTab, children: pages),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFD3DDE3))),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedTab,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFFE11E2B),
          unselectedItemColor: Colors.black87,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
          backgroundColor: Colors.white,
          onTap: (index) {
            setState(() {
              _selectedTab = index;
            });
          },
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.home_filled),
              label: labels[0],
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.sos),
              label: labels[1],
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: labels[2],
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.medication_rounded),
              label: labels[3],
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.support_agent_rounded),
              label: labels[4],
            ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
    required this.onOpenMedicalInfo,
    required this.onOpenSos,
    required this.onOpenMedicines,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;
  final VoidCallback onOpenMedicalInfo;
  final VoidCallback onOpenSos;
  final VoidCallback onOpenMedicines;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Map<String, dynamic>> _myMedicines = [];
  bool _loadingMedicines = true;
  String? _medicineError;

  @override
  void initState() {
    super.initState();
    _loadMedicinesSummary();
  }

  Future<void> _loadMedicinesSummary() async {
    setState(() {
      _loadingMedicines = true;
      _medicineError = null;
    });

    try {
      final items = await widget.apiClient.getMedicines(
        mineOnly: true,
        token: widget.session.token,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _myMedicines = items
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _medicineError = error.message;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _medicineError = widget.strings.t('common.error');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingMedicines = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    final contacts = widget.session.emergencyContacts;

    final reminders = _myMedicines
        .where((item) => (item['reminderTime']?.toString() ?? '').isNotEmpty)
        .take(2)
        .map((item) {
          final name =
              item['name']?.toString() ?? strings.t('medicines.unknown');
          final reminderTime = item['reminderTime']?.toString() ?? '--:--';
          return '$name - $reminderTime';
        })
        .toList();

    if (reminders.isEmpty) {
      reminders.addAll([
        strings.t('home.defaultReminderMedicine'),
        strings.t('home.defaultReminderVaccine'),
      ]);
    }

    final topMedicines = _myMedicines.take(2).map((item) {
      final name = item['name']?.toString() ?? strings.t('medicines.unknown');
      final quantity = item['quantity'];
      final unit =
          item['unit']?.toString() ?? strings.t('medicines.defaultUnit');
      if (quantity is int || quantity is double) {
        return '$name: ${quantity.toString()} $unit';
      }
      return name;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadMedicinesSummary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  strings.t('home.greeting'),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: Colors.black,
                  ),
                ),
              ),
              Image.asset(
                'assets/design/healthcare_logo.png',
                height: 34,
                errorBuilder: (_, error, stackTrace) => const SizedBox.shrink(),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            widget.session.fullName,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF111827),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          _SectionTitle(
            title: strings.t('home.reminders'),
            trailing: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(strings.t('home.reminderComingSoon'))),
                );
              },
              child: Text(strings.t('home.createReminder')),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _AssetIcon(
                        assetPath: 'assets/design/clock_icon.png',
                        fallbackIcon: Icons.schedule,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        strings.t('home.todaySchedule'),
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  for (final reminder in reminders)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_box_rounded,
                            size: 18,
                            color: Color(0xFF111827),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              reminder,
                              style: Theme.of(context).textTheme.bodyLarge
                                  ?.copyWith(color: const Color(0xFF111827)),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final useRow = constraints.maxWidth >= 680;
              
              final card1 = _SummaryCard(
                title: strings.t('home.medicalCardTitle'),
                icon: _AssetIcon(
                  assetPath: 'assets/design/blood_icon.png',
                  fallbackIcon: Icons.bloodtype,
                ),
                lines: [
                  '${strings.t('home.bloodType')}: ${widget.session.bloodType ?? strings.t('common.notProvided')}',
                  '${strings.t('home.allergies')}: ${widget.session.allergies ?? strings.t('common.notProvided')}',
                  '${strings.t('home.emergencyCount')}: ${contacts.length}',
                ],
                onTap: widget.onOpenMedicalInfo,
              );

              final card2 = _SummaryCard(
                title: strings.t('home.medicineCardTitle'),
                icon: _AssetIcon(
                  assetPath: 'assets/design/medicine_icon.png',
                  fallbackIcon: Icons.medication,
                ),
                lines: _loadingMedicines
                    ? [strings.t('common.loading')]
                    : _medicineError != null
                    ? [_medicineError!]
                    : topMedicines.isEmpty
                    ? [strings.t('medicines.empty')]
                    : topMedicines,
                onTap: widget.onOpenMedicines,
              );

              if (useRow) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: card1),
                    const SizedBox(width: 12),
                    Expanded(child: card2),
                  ],
                );
              }

              return Column(
                children: [
                  card1,
                  const SizedBox(height: 12),
                  card2,
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 58,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFE11E2B),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              onPressed: widget.onOpenSos,
              icon: _AssetIcon(
                assetPath: 'assets/design/sos_icon.png',
                fallbackIcon: Icons.sos,
                size: 18,
                color: Colors.white,
              ),
              label: Text(
                'SOS',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.icon,
    required this.lines,
    required this.onTap,
  });

  final String title;
  final Widget icon;
  final List<String> lines;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  icon,
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const Icon(Icons.edit_outlined, size: 18),
                ],
              ),
              const SizedBox(height: 8),
              for (final line in lines)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Text(
                    line,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF111827),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class MedicalInfoScreen extends StatefulWidget {
  const MedicalInfoScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;

  @override
  State<MedicalInfoScreen> createState() => _MedicalInfoScreenState();
}

class _MedicalInfoScreenState extends State<MedicalInfoScreen> {
  static const List<String> _bloodTypes = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
  ];

  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _allergiesController;
  late final TextEditingController _chronicConditionsController;

  String? _selectedBloodType;
  bool _saving = false;
  final List<_EmergencyContactDraft> _contactDrafts = [];

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.session.fullName);
    _phoneController = TextEditingController(text: widget.session.phone ?? '');
    _allergiesController = TextEditingController(
      text: widget.session.allergies ?? '',
    );
    _chronicConditionsController = TextEditingController(
      text: widget.session.chronicConditions ?? '',
    );

    final normalizedBlood = widget.session.bloodType?.trim();
    _selectedBloodType = _bloodTypes.contains(normalizedBlood)
        ? normalizedBlood
        : null;

    final contacts = widget.session.emergencyContacts;
    if (contacts.isEmpty) {
      _contactDrafts.add(_EmergencyContactDraft());
    } else {
      for (final contact in contacts) {
        _contactDrafts.add(
          _EmergencyContactDraft(name: contact.name, phone: contact.phone),
        );
      }
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _allergiesController.dispose();
    _chronicConditionsController.dispose();
    for (final draft in _contactDrafts) {
      draft.dispose();
    }
    super.dispose();
  }

  String? _normalizeOptional(dynamic value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty || text == 'null') {
      return null;
    }

    return text;
  }

  List<EmergencyContact> _buildContacts() {
    return _contactDrafts
        .map(
          (draft) => EmergencyContact(
            name: draft.nameController.text.trim(),
            phone: draft.phoneController.text.trim(),
          ),
        )
        .where((contact) => contact.name.isNotEmpty && contact.phone.isNotEmpty)
        .take(5)
        .toList();
  }

  Future<void> _save() async {
    if (_fullNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.strings.t('medical.requireName'))),
      );
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      final contacts = _buildContacts();

      final body = await widget.apiClient.updateMe(
        token: widget.session.token,
        fullName: _fullNameController.text.trim(),
        phone: _phoneController.text.trim(),
        bloodType: _selectedBloodType,
        allergies: _allergiesController.text.trim(),
        chronicConditions: _chronicConditionsController.text.trim(),
        emergencyContacts: contacts,
      );

      if (!mounted) {
        return;
      }

      final updatedSession = AuthSession.fromJson({
        'token': widget.session.token,
        'user': {
          'id': body['id']?.toString() ?? widget.session.userId,
          'email': body['email']?.toString() ?? widget.session.email,
          'fullName':
              body['fullName']?.toString() ?? _fullNameController.text.trim(),
          'phone': _normalizeOptional(body['phone']),
          'bloodType': _normalizeOptional(body['bloodType']),
          'allergies': _normalizeOptional(body['allergies']),
          'chronicConditions': _normalizeOptional(body['chronicConditions']),
          'emergencyContactName': _normalizeOptional(
            body['emergencyContactName'],
          ),
          'emergencyContactPhone': _normalizeOptional(
            body['emergencyContactPhone'],
          ),
          'emergencyContacts': body['emergencyContacts'],
        },
      });

      Navigator.of(context).pop(updatedSession);
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  void _addContact() {
    if (_contactDrafts.length >= 5) {
      return;
    }

    setState(() {
      _contactDrafts.add(_EmergencyContactDraft());
    });
  }

  void _removeContact(int index) {
    if (_contactDrafts.length == 1) {
      _contactDrafts.first.nameController.clear();
      _contactDrafts.first.phoneController.clear();
      return;
    }

    setState(() {
      final draft = _contactDrafts.removeAt(index);
      draft.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;

    return Scaffold(
      appBar: AppBar(title: Text(strings.t('medical.title'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _fullNameController,
                    decoration: InputDecoration(
                      labelText: strings.t('medical.fullName'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneController,
                    decoration: InputDecoration(
                      labelText: strings.t('medical.phone'),
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedBloodType,
                    decoration: InputDecoration(
                      labelText: strings.t('medical.bloodType'),
                    ),
                    items: _bloodTypes
                        .map(
                          (bloodType) => DropdownMenuItem(
                            value: bloodType,
                            child: Text(bloodType),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedBloodType = value;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _allergiesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: strings.t('medical.allergies'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _chronicConditionsController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: strings.t('medical.chronicConditions'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(
                    title: strings.t('medical.emergencyContacts'),
                    trailing: TextButton.icon(
                      onPressed: _contactDrafts.length >= 5
                          ? null
                          : _addContact,
                      icon: const Icon(Icons.add),
                      label: Text(strings.t('medical.addContact')),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    strings.t('medical.contactHint'),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (
                    var index = 0;
                    index < _contactDrafts.length;
                    index++
                  ) ...[
                    _EmergencyContactForm(
                      index: index,
                      strings: strings,
                      draft: _contactDrafts[index],
                      onRemove: () => _removeContact(index),
                    ),
                    if (index != _contactDrafts.length - 1)
                      const SizedBox(height: 10),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: const Icon(Icons.save_outlined),
              label: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(strings.t('medical.update')),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmergencyContactForm extends StatelessWidget {
  const _EmergencyContactForm({
    required this.index,
    required this.strings,
    required this.draft,
    required this.onRemove,
  });

  final int index;
  final AppStrings strings;
  final _EmergencyContactDraft draft;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD5DEE6)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                '${strings.t('medical.contact')} ${index + 1}',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              IconButton(
                tooltip: strings.t('medical.removeContact'),
                onPressed: onRemove,
                icon: const Icon(Icons.remove_circle_outline_rounded),
              ),
            ],
          ),
          TextField(
            controller: draft.nameController,
            decoration: InputDecoration(
              labelText: strings.t('medical.emergencyContactName'),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: draft.phoneController,
            decoration: InputDecoration(
              labelText: strings.t('medical.emergencyContactPhone'),
            ),
            keyboardType: TextInputType.phone,
          ),
        ],
      ),
    );
  }
}

class _EmergencyContactDraft {
  _EmergencyContactDraft({String? name, String? phone})
    : nameController = TextEditingController(text: name ?? ''),
      phoneController = TextEditingController(text: phone ?? '');

  final TextEditingController nameController;
  final TextEditingController phoneController;

  void dispose() {
    nameController.dispose();
    phoneController.dispose();
  }
}

class SosScreen extends StatefulWidget {
  const SosScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final TextEditingController _noteController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
    });

    try {
      await widget.apiClient.createSos(
        token: widget.session.token,
        userId: widget.session.userId,
        note: _noteController.text,
      );

      if (!mounted) {
        return;
      }

      _noteController.clear();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(widget.strings.t('sos.success'))));
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  Future<void> _copyPrimaryContactPhone() async {
    final contacts = widget.session.emergencyContacts;
    if (contacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.strings.t('sos.noContact'))),
      );
      return;
    }

    final phone = contacts.first.phone;
    await Clipboard.setData(ClipboardData(text: phone));

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(widget.strings.t('sos.phoneCopied'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    final contacts = widget.session.emergencyContacts;
    final sosWebUrl = 'https://your-sos-web.vercel.app/?userId=${widget.session.userId}';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          strings.t('sos.profileTitle'),
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Stack(
                      children: [
                        const CircleAvatar(
                          radius: 22,
                          backgroundColor: Color(0xFF111827),
                          child: Icon(Icons.person, color: Colors.white),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFFE11E2B),
                            ),
                            child: IconButton(
                              constraints: const BoxConstraints(
                                minHeight: 28,
                                minWidth: 28,
                              ),
                              padding: EdgeInsets.zero,
                              icon: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(strings.t('common.loading'))),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              strings.t('sos.personalInfo'),
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(strings.t('common.loading'))),
                              );
                            },
                            tooltip: widget.strings.t('medical.update'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _InfoLine(
                  label: strings.t('medical.fullName'),
                  value: widget.session.fullName,
                ),
                _InfoLine(
                  label: strings.t('medical.phone'),
                  value:
                      widget.session.phone ?? strings.t('common.notProvided'),
                ),
                _InfoLine(
                  label: strings.t('medical.bloodType'),
                  value:
                      widget.session.bloodType ??
                      strings.t('common.notProvided'),
                ),
                _InfoLine(
                  label: strings.t('medical.allergies'),
                  value:
                      widget.session.allergies ??
                      strings.t('common.notProvided'),
                ),
                _InfoLine(
                  label: strings.t('medical.chronicConditions'),
                  value:
                      widget.session.chronicConditions ??
                      strings.t('common.notProvided'),
                ),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () async {
                    await Clipboard.setData(
                      ClipboardData(text: widget.session.userId),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('User ID copied.')),
                      );
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: Theme.of(context).textTheme.bodyLarge
                                  ?.copyWith(color: const Color(0xFF111827)),
                              children: [
                                const TextSpan(
                                  text: 'User ID: ',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                                TextSpan(
                                  text: widget.session.userId,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    color: Color(0xFF374151),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.copy,
                          size: 16,
                          color: Color(0xFF6B7280),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.t('sos.qrCode'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  strings.t('sos.qrDesc'),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF6B7280)),
                ),
                const SizedBox(height: 12),
                Center(
                  child: QrImageView(
                    data: sosWebUrl,
                    version: QrVersions.auto,
                    size: 200,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: sosWebUrl));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(strings.t('sos.phoneCopied'))),
                        );
                      }
                    },
                    icon: const Icon(Icons.share_outlined),
                    label: Text(strings.t('sos.saveQr')),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _AssetIcon(
                      assetPath: 'assets/design/call_icon.png',
                      fallbackIcon: Icons.call,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      strings.t('sos.emergencyContacts'),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (contacts.isEmpty)
                  Text(
                    strings.t('sos.noContact'),
                    style: Theme.of(context).textTheme.bodyMedium,
                  )
                else
                  for (var i = 0; i < contacts.length; i++)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        '${strings.t('medical.contact')} ${i + 1}: ${contacts[i].name} (${contacts[i].phone})',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: const Color(0xFF111827),
                        ),
                      ),
                    ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFD62828),
                    ),
                    onPressed: _copyPrimaryContactPhone,
                    child: Text(strings.t('sos.callRelative')),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.t('sos.helper'),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _noteController,
                  maxLines: 4,
                  decoration: InputDecoration(labelText: strings.t('sos.note')),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFE11E2B),
                    ),
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.sos),
                    label: _sending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(strings.t('sos.send')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

enum ScannerMode { qr, barcode, face }

const Duration _kScannerDebounce = Duration(milliseconds: 1500);

/// Custom painter for scanner overlay guide
class _ScannerOverlayPainter extends CustomPainter {
  final ScannerMode mode;
  final Size screenSize;

  _ScannerOverlayPainter({required this.mode, required this.screenSize});

  @override
  void paint(Canvas canvas, Size size) {
    // Semi-transparent dark overlay
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()
        ..color = Colors.black.withOpacity(0.4)
        ..style = PaintingStyle.fill,
    );

    // Draw target area with clear (transparent) region
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    if (mode == ScannerMode.face) {
      // Oval for face recognition
      final ovalRect = Rect.fromCenter(
        center: Offset(size.width / 2, size.height / 2),
        width: size.width * 0.6,
        height: size.height * 0.7,
      );
      canvas.drawOval(ovalRect, paint..blendMode = BlendMode.clear);

      // Draw oval border
      canvas.drawOval(
        ovalRect,
        Paint()
          ..color = Colors.white70
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke,
      );
    } else {
      // Rectangle for barcode/QR
      final rectSize = size.width * 0.7;
      final targetRect = Rect.fromCenter(
        center: Offset(size.width / 2, size.height / 2),
        width: rectSize,
        height: rectSize,
      );
      canvas.drawRect(targetRect, paint..blendMode = BlendMode.clear);

      // Draw rectangle border
      canvas.drawRect(
        targetRect,
        Paint()
          ..color = Colors.white70
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke,
      );

      // Draw corner markers
      const cornerLength = 20.0;
      final corners = [
        [targetRect.topLeft, targetRect.topLeft + const Offset(cornerLength, 0), targetRect.topLeft + const Offset(0, cornerLength)],
        [targetRect.topRight, targetRect.topRight + const Offset(-cornerLength, 0), targetRect.topRight + const Offset(0, cornerLength)],
        [targetRect.bottomLeft, targetRect.bottomLeft + const Offset(cornerLength, 0), targetRect.bottomLeft + const Offset(0, -cornerLength)],
        [targetRect.bottomRight, targetRect.bottomRight + const Offset(-cornerLength, 0), targetRect.bottomRight + const Offset(0, -cornerLength)],
      ];

      final cornerPaint = Paint()
        ..color = Colors.white
        ..strokeWidth = 3
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      for (final corner in corners) {
        canvas.drawLine(corner[0], corner[1], cornerPaint);
        canvas.drawLine(corner[0], corner[2], cornerPaint);
      }
    }
  }

  @override
  bool shouldRepaint(_ScannerOverlayPainter oldDelegate) {
    return oldDelegate.mode != mode || oldDelegate.screenSize != screenSize;
  }
}

String? _extractUserIdFromQr(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  final uuidPattern = RegExp(
    r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
  );

  final uri = Uri.tryParse(trimmed);
  if (uri != null && uri.hasScheme) {
    final queryId = uri.queryParameters['userId'];
    if (queryId != null && queryId.isNotEmpty) return queryId;
    for (final segment in uri.pathSegments.reversed) {
      if (uuidPattern.hasMatch(segment)) return segment;
    }
  }

  final match = uuidPattern.firstMatch(trimmed);
  return match?.group(0);
}

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession? session;

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with WidgetsBindingObserver {
  late final MobileScannerController _cameraController;
  late final MobileScannerController _faceCameraController;
  ScannerMode _mode = ScannerMode.barcode;
  bool _isCameraActive = true;
  String? _scannedValue;
  Map<String, dynamic>? _result;
  String? _qrUserId;
  String? _error;
  bool _loading = false;
  AppLifecycleState? _lastLifecycleState;

  DateTime? _lastDetectionAt;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _cameraController = MobileScannerController(
      formats: const [BarcodeFormat.qrCode, BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.code128, BarcodeFormat.upcA, BarcodeFormat.upcE],
    );
    _faceCameraController = MobileScannerController(
      facing: CameraFacing.front,
      formats: const [],
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _debounceTimer?.cancel();
    _cameraController.dispose();
    _faceCameraController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lastLifecycleState = state;
    switch (state) {
      case AppLifecycleState.resumed:
        if (_mode == ScannerMode.face) {
          _faceCameraController.start();
        } else if (_isCameraActive && _scannedValue == null) {
          _cameraController.start();
        }
        break;
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        _cameraController.stop();
        _faceCameraController.stop();
        break;
      case AppLifecycleState.inactive:
        break;
    }
  }

  /// Pause camera when tab loses focus
  void pauseCamera() {
    _cameraController.stop();
    _faceCameraController.stop();
  }

  /// Resume camera when tab gains focus
  void resumeCamera() {
    if (_mode == ScannerMode.face) {
      _faceCameraController.start();
    } else if (_isCameraActive && _scannedValue == null) {
      _cameraController.start();
    }
  }

  bool _shouldAcceptDetection() {
    final now = DateTime.now();
    final last = _lastDetectionAt;
    if (last != null && now.difference(last) < _kScannerDebounce) {
      return false;
    }
    _lastDetectionAt = now;
    return true;
  }

  void _onDetect(BarcodeCapture capture) {
    if (_mode == ScannerMode.face) return;
    if (_loading) return;

    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty) return;
    if (!_shouldAcceptDetection()) return;

    switch (_mode) {
      case ScannerMode.qr:
        unawaited(_handleQr(raw));
        break;
      case ScannerMode.barcode:
        unawaited(_handleBarcode(raw));
        break;
      case ScannerMode.face:
        break;
    }
  }

  Future<void> _handleQr(String raw) async {
    await _cameraController.stop();
    if (!mounted) return;
    setState(() {
      _isCameraActive = false;
      _scannedValue = raw;
      _qrUserId = _extractUserIdFromQr(raw);
      _result = null;
      _error = null;
    });
  }

  Future<void> _handleBarcode(String raw) async {
    await _cameraController.stop();
    if (!mounted) return;
    setState(() {
      _isCameraActive = false;
      _scannedValue = raw;
      _qrUserId = null;
      _loading = true;
      _error = null;
      _result = null;
    });

    try {
      final medicine = await widget.apiClient.lookupMedicineByBarcode(
        raw,
        token: widget.session?.token,
      );
      if (!mounted) return;
      setState(() {
        _result = medicine;
        if (medicine == null) {
          _error = widget.strings.t('scanner.noResult');
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = widget.strings.t('common.error'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _switchMode(ScannerMode next) async {
    if (_mode == next) return;
    _debounceTimer?.cancel();
    _lastDetectionAt = null;

    // Stop both cameras before switching
    await _cameraController.stop();
    await _faceCameraController.stop();

    setState(() {
      _mode = next;
      _scannedValue = null;
      _qrUserId = null;
      _result = null;
      _error = null;
      _isCameraActive = next != ScannerMode.face;
    });

    // Start the appropriate camera
    if (next == ScannerMode.face) {
      try {
        await _faceCameraController.start();
      } catch (e) {
        if (mounted) {
          setState(() {
            _error = widget.strings.t('common.error');
          });
        }
      }
    } else {
      try {
        await _cameraController.start();
      } catch (e) {
        if (mounted) {
          setState(() {
            _error = widget.strings.t('common.error');
          });
        }
      }
    }
  }

  void _resetScan() {
    _lastDetectionAt = null;
    setState(() {
      _scannedValue = null;
      _qrUserId = null;
      _result = null;
      _error = null;
      _isCameraActive = _mode != ScannerMode.face;
    });
    if (_mode != ScannerMode.face) {
      _cameraController.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: SegmentedButton<ScannerMode>(
            segments: [
              ButtonSegment(
                value: ScannerMode.qr,
                label: Text(strings.t('scanner.qrMode')),
                icon: const Icon(Icons.qr_code_rounded, size: 18),
              ),
              ButtonSegment(
                value: ScannerMode.barcode,
                label: Text(strings.t('scanner.barcodeMode')),
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
              ),
              ButtonSegment(
                value: ScannerMode.face,
                label: Text(strings.t('scanner.faceMode')),
                icon: const Icon(Icons.face_rounded, size: 18),
              ),
            ],
            selected: {_mode},
            onSelectionChanged: (val) => _switchMode(val.first),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          flex: 5,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: _buildCameraSurface(strings),
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: _buildResult(context),
          ),
        ),
      ],
    );
  }

  Widget _buildCameraSurface(AppStrings strings) {
    if (_mode == ScannerMode.face) {
      return Stack(
        children: [
          MobileScanner(
            controller: _faceCameraController,
            onDetect: (_) {}, // Face detection is handled differently
          ),
          // Overlay with face recognition guide
          CustomPaint(
            painter: _ScannerOverlayPainter(
              mode: _mode,
              screenSize: MediaQuery.of(context).size,
            ),
            size: Size.infinite,
          ),
          // Controls
          Positioned(
            bottom: 12,
            right: 12,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  backgroundColor: const Color(0xFF0D5C7A),
                  child: const Icon(Icons.image),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(strings.t('common.loading'))),
                    );
                  },
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  backgroundColor: const Color(0xFF0D5C7A),
                  child: const Icon(Icons.flip_camera_ios),
                  onPressed: () async {
                    await _faceCameraController.switchCamera();
                  },
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (!_isCameraActive) {
      return Container(
        color: Colors.black87,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.green, size: 48),
              const SizedBox(height: 8),
              Text(
                _scannedValue ?? '',
                style: const TextStyle(color: Colors.white, fontSize: 12),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: _resetScan,
                icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                label: Text(strings.t('common.retry'), style: const TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: [
        MobileScanner(
          controller: _cameraController,
          onDetect: _onDetect,
        ),
        // Overlay with scanner guide
        CustomPaint(
          painter: _ScannerOverlayPainter(
            mode: _mode,
            screenSize: MediaQuery.of(context).size,
          ),
          size: Size.infinite,
        ),
      ],
    );
  }

  Widget _buildResult(BuildContext context) {
    final strings = widget.strings;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEBEE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFFCDD2)),
        ),
        child: Text(_error!, style: const TextStyle(color: Color(0xFFB71C1C))),
      );
    }

    if (_mode == ScannerMode.qr && _scannedValue != null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                strings.t('scanner.qrResultTitle'),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (_qrUserId != null) ...[
                Text(strings.t('scanner.qrUserId'), style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 2),
                SelectableText(_qrUserId!, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
              ],
              Text(strings.t('scanner.qrRaw'), style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 2),
              SelectableText(_scannedValue!, style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
            ],
          ),
        ),
      );
    }

    final result = _result;
    if (result == null) {
      return Center(
        child: Text(
          _modePrompt(strings),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFF6B7280)),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              strings.t('scanner.resultTitle'),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (result['name'] != null) Text(result['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600)),
            if (result['active_ingredient'] != null) ...[const SizedBox(height: 4), Text(result['active_ingredient'].toString())],
            if (result['description'] != null) ...[const SizedBox(height: 4), Text(result['description'].toString())],
          ],
        ),
      ),
    );
  }

  String _modePrompt(AppStrings strings) {
    switch (_mode) {
      case ScannerMode.qr:
        return strings.t('scanner.qrPrompt');
      case ScannerMode.barcode:
        return strings.t('scanner.tapToScan');
      case ScannerMode.face:
        return strings.t('scanner.faceHint');
    }
  }
}

class MedicinesScreen extends StatefulWidget {
  const MedicinesScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;

  @override
  State<MedicinesScreen> createState() => _MedicinesScreenState();
}

class _MedicinesScreenState extends State<MedicinesScreen> {
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
    _load();
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await widget.apiClient.getMedicines(
        mineOnly: true,
        token: widget.session.token,
      );
      if (!mounted) {
        return;
      }

      setState(() {
        _items = items
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error.message;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = widget.strings.t('common.error');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _openCreateSheet() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateMedicineSheet(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
      ),
    );

    if (created == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.strings.t('medicines.addSuccess'))),
        );
      }
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyword = _searchController.text.trim().toLowerCase();
    final filteredItems = keyword.isEmpty
        ? _items
        : _items.where((medicine) {
            final name = medicine['name']?.toString().toLowerCase() ?? '';
            final ingredient =
                medicine['active_ingredient']?.toString().toLowerCase() ?? '';
            return name.contains(keyword) || ingredient.contains(keyword);
          }).toList();

    final today = DateTime.now();
    final expiredCount = filteredItems.where((item) {
      final date = _tryParseDate(item['expiresAt']?.toString());
      return date != null &&
          date.isBefore(DateTime(today.year, today.month, today.day));
    }).length;

    final nearExpiryCount = filteredItems.where((item) {
      final date = _tryParseDate(item['expiresAt']?.toString());
      if (date == null) {
        return false;
      }

      final dayStart = DateTime(today.year, today.month, today.day);
      if (date.isBefore(dayStart)) {
        return false;
      }

      return date.difference(dayStart).inDays <= 30;
    }).length;

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: widget.strings.t('medicines.searchHint'),
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: IconButton(
                  onPressed: _load,
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: widget.strings.t('medicines.refresh'),
                ),
              ),
            ),
            const SizedBox(height: 10),
            if (_loading) const LinearProgressIndicator(),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: Color(0xFFB71C1C),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFFB71C1C),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _load,
                      child: Text(widget.strings.t('common.retry')),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      widget.strings.t('medicines.currentMedicines'),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${widget.strings.t('medicines.totalTypes')}: ${filteredItems.length}',
                      textAlign: TextAlign.center,
                    ),
                    Text(
                      '${widget.strings.t('medicines.expired')}: $expiredCount',
                      textAlign: TextAlign.center,
                    ),
                    Text(
                      '${widget.strings.t('medicines.nearExpiry')}: $nearExpiryCount',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: filteredItems.isEmpty && !_loading
                  ? Center(
                      child: Text(
                        widget.strings.t('medicines.emptyMine'),
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: const Color(0xFF334155),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.separated(
                      itemCount: filteredItems.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final medicine = filteredItems[index];
                        final name =
                            medicine['name']?.toString() ??
                            widget.strings.t('medicines.unknown');
                        final ingredient =
                            medicine['active_ingredient']?.toString() ?? '';
                        final quantity = medicine['quantity'];
                        final quantityText = quantity == null
                            ? stringsOr(widget.strings, 'common.notProvided')
                            : quantity.toString();
                        final unit = medicine['unit']?.toString();
                        final expiresAt = medicine['expiresAt']?.toString();
                        final reminderTime = medicine['reminderTime']
                            ?.toString();

                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.medication_rounded,
                                      size: 32,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        name,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (ingredient.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(ingredient),
                                ],
                                const SizedBox(height: 6),
                                Text(
                                  '${widget.strings.t('medicines.quantity')}: $quantityText ${unit ?? widget.strings.t('medicines.defaultUnit')}',
                                ),
                                Text(
                                  '${widget.strings.t('medicines.expiryDate')}: ${expiresAt ?? widget.strings.t('common.notProvided')}',
                                ),
                                Text(
                                  '${widget.strings.t('medicines.reminderTime')}: ${reminderTime ?? widget.strings.t('common.notProvided')}',
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFE11E2B),
        foregroundColor: Colors.white,
        onPressed: _openCreateSheet,
        icon: const Icon(Icons.add_rounded),
        label: Text(widget.strings.t('medicines.addDrug')),
      ),
    );
  }

  DateTime? _tryParseDate(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    try {
      return DateTime.parse(value);
    } catch (_) {
      return null;
    }
  }

  String stringsOr(AppStrings strings, String key) {
    return strings.t(key);
  }
}

class _CreateMedicineSheet extends StatefulWidget {
  const _CreateMedicineSheet({
    required this.strings,
    required this.apiClient,
    required this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;

  @override
  State<_CreateMedicineSheet> createState() => _CreateMedicineSheetState();
}

class _CreateMedicineSheetState extends State<_CreateMedicineSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final MobileScannerController _scannerController = MobileScannerController();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _ingredientController = TextEditingController();
  final TextEditingController _barcodeController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _contraController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitController = TextEditingController(text: 'viên');

  DateTime? _expiresAt;
  TimeOfDay? _reminderTime;
  bool _saving = false;
  bool _scanning = false;
  String? _error;
  DateTime? _lastDetectionAt;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 0) {
        _scannerController.stop();
      } else {
        _lastDetectionAt = null;
        _scannerController.start();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scannerController.dispose();
    _nameController.dispose();
    _ingredientController.dispose();
    _barcodeController.dispose();
    _descriptionController.dispose();
    _contraController.dispose();
    _quantityController.dispose();
    _unitController.dispose();
    super.dispose();
  }

  Future<void> _onBarcodeDetected(BarcodeCapture capture) async {
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty || _scanning) return;

    final now = DateTime.now();
    final last = _lastDetectionAt;
    if (last != null && now.difference(last) < _kScannerDebounce) {
      return;
    }
    _lastDetectionAt = now;

    await _scannerController.stop();
    setState(() {
      _scanning = true;
      _error = null;
    });

    try {
      final medicine = await widget.apiClient.lookupMedicineByBarcode(raw, token: widget.session.token);
      if (!mounted) return;

      if (medicine != null) {
        _nameController.text = medicine['name']?.toString() ?? '';
        _ingredientController.text = medicine['active_ingredient']?.toString() ?? '';
        _barcodeController.text = raw;
        _descriptionController.text = medicine['description']?.toString() ?? '';
        _contraController.text = medicine['contraindications']?.toString() ?? '';
        _tabController.animateTo(0);
        setState(() {
          _error = null;
        });
      } else {
        _barcodeController.text = raw;
        _tabController.animateTo(0);
        setState(() {
          _error = widget.strings.t('scanner.noResult');
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = widget.strings.t('common.error'));
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _pickExpiryDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 15),
      initialDate: _expiresAt ?? now,
    );
    if (picked == null) return;
    setState(() => _expiresAt = picked);
  }

  Future<void> _pickReminderTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _reminderTime ?? const TimeOfDay(hour: 8, minute: 0),
    );
    if (picked == null) return;
    setState(() => _reminderTime = picked);
  }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      final quantity = int.tryParse(_quantityController.text.trim());
      await widget.apiClient.createMedicine(
        token: widget.session.token,
        name: _nameController.text,
        activeIngredient: _ingredientController.text,
        barcode: _barcodeController.text,
        description: _descriptionController.text,
        contraindications: _contraController.text,
        quantity: quantity,
        unit: _unitController.text,
        expiresAt: _expiresAt == null ? null : _formatDate(_expiresAt!),
        reminderTime: _reminderTime == null ? null : _formatTime(_reminderTime!),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final strings = widget.strings;

    return Container(
      height: MediaQuery.sizeOf(context).height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD0D5DD),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              strings.t('medicines.formTitle'),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 8),
          TabBar(
            controller: _tabController,
            tabs: [
              Tab(text: strings.t('medicines.manualInput'), icon: const Icon(Icons.edit_note_rounded)),
              Tab(text: strings.t('medicines.scanBarcode'), icon: const Icon(Icons.qr_code_scanner_rounded)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildManualForm(context, bottomInset, strings),
                _buildScanTab(context, strings),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualForm(BuildContext context, double bottomInset, AppStrings strings) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(controller: _nameController, decoration: InputDecoration(labelText: strings.t('medicines.formName'))),
          const SizedBox(height: 10),
          TextField(controller: _ingredientController, decoration: InputDecoration(labelText: strings.t('medicines.formIngredient'))),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextField(controller: _quantityController, decoration: InputDecoration(labelText: strings.t('medicines.formQuantity')), keyboardType: TextInputType.number)),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _unitController, decoration: InputDecoration(labelText: strings.t('medicines.formUnit')))),
          ]),
          const SizedBox(height: 10),
          TextField(controller: _barcodeController, decoration: InputDecoration(labelText: strings.t('medicines.formBarcode')), keyboardType: TextInputType.number),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: OutlinedButton.icon(onPressed: _pickExpiryDate, icon: const Icon(Icons.event_outlined), label: Text(_expiresAt == null ? strings.t('medicines.pickExpiryDate') : _formatDate(_expiresAt!)))),
            const SizedBox(width: 10),
            Expanded(child: OutlinedButton.icon(onPressed: _pickReminderTime, icon: const Icon(Icons.schedule_outlined), label: Text(_reminderTime == null ? strings.t('medicines.pickReminderTime') : _formatTime(_reminderTime!)))),
          ]),
          const SizedBox(height: 10),
          TextField(controller: _descriptionController, maxLines: 3, decoration: InputDecoration(labelText: strings.t('medicines.formDescription'))),
          const SizedBox(height: 10),
          TextField(controller: _contraController, maxLines: 3, decoration: InputDecoration(labelText: strings.t('medicines.formContra'))),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFFB71C1C))),
          ],
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: OutlinedButton(onPressed: _saving ? null : () => Navigator.of(context).pop(), child: Text(strings.t('common.cancel')))),
            const SizedBox(width: 12),
            Expanded(child: FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : Text(strings.t('common.add')),
            )),
          ]),
        ],
      ),
    );
  }

  Widget _buildScanTab(BuildContext context, AppStrings strings) {
    return Column(
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(strings.t('medicines.scanning'), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF6B7280))),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _scanning
                  ? const Center(child: CircularProgressIndicator())
                  : MobileScanner(
                      controller: _scannerController,
                      onDetect: _onBarcodeDetected,
                    ),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({
    super.key,
    required this.strings,
    required this.apiClient,
  });

  final AppStrings strings;
  final ApiClient apiClient;

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_ChatEntry> _messages = [];

  bool _loading = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) {
      return;
    }

    setState(() {
      _loading = true;
      _messages.add(_ChatEntry(message: message, isUser: true));
      _messageController.clear();
    });
    _scrollToBottom();

    try {
      final body = await widget.apiClient.askChatbot(message);
      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(
          _ChatEntry(
            message:
                body['answer']?.toString() ?? widget.strings.t('common.error'),
            isUser: false,
          ),
        );
      });
      _scrollToBottom();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(_ChatEntry(message: error.message, isUser: false));
      });
      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Card(
              child: _messages.isEmpty
                  ? Center(
                      child: Text(
                        widget.strings.t('chatbot.empty'),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF334155),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(14),
                      itemCount: _messages.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = _messages[index];
                        return Align(
                          alignment: item.isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            constraints: const BoxConstraints(maxWidth: 320),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: item.isUser
                                  ? const Color(0xFFE11E2B)
                                  : const Color(0xFFE2ECF2),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              item.message,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: item.isUser
                                        ? Colors.white
                                        : const Color(0xFF111827),
                                  ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: widget.strings.t('chatbot.message'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                onPressed: _loading ? null : _send,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(widget.strings.t('chatbot.send')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChatEntry {
  const _ChatEntry({required this.message, required this.isUser});

  final String message;
  final bool isUser;
}

class _AssetIcon extends StatelessWidget {
  const _AssetIcon({
    required this.assetPath,
    required this.fallbackIcon,
    this.size = 20,
    this.color,
  });

  final String assetPath;
  final IconData fallbackIcon;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      assetPath,
      width: size,
      height: size,
      color: color,
      errorBuilder: (_, error, stackTrace) =>
          Icon(fallbackIcon, size: size, color: color),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              color: Colors.black,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: RichText(
        text: TextSpan(
          style: Theme.of(
            context,
          ).textTheme.bodyLarge?.copyWith(color: const Color(0xFF111827)),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}

class _QuickScanScreen extends StatefulWidget {
  const _QuickScanScreen({required this.strings});
  final AppStrings strings;
  @override
  State<_QuickScanScreen> createState() => _QuickScanScreenState();
}

class _QuickScanScreenState extends State<_QuickScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  String? _result;
  String? _qrUserId;
  DateTime? _lastDetectionAt;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_result != null) return;

    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty) return;

    final now = DateTime.now();
    final last = _lastDetectionAt;
    if (last != null && now.difference(last) < _kScannerDebounce) {
      return;
    }
    _lastDetectionAt = now;

    _controller.stop();
    setState(() {
      _result = raw;
      _qrUserId = _extractUserIdFromQr(raw);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.strings.t('quickScan.title'))),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: MobileScanner(controller: _controller, onDetect: _result == null ? _onDetect : null),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _result == null
                  ? Center(child: Text(widget.strings.t('quickScan.desc'), textAlign: TextAlign.center))
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_qrUserId != null) ...[
                          Text(widget.strings.t('scanner.qrUserId'), style: Theme.of(context).textTheme.bodySmall),
                          const SizedBox(height: 2),
                          SelectableText(_qrUserId!, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                        ],
                        Text(widget.strings.t('scanner.qrRaw'), style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 2),
                        SelectableText(_result!, style: const TextStyle(fontFamily: 'monospace', fontSize: 14)),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: () {
                            setState(() {
                              _result = null;
                              _qrUserId = null;
                              _lastDetectionAt = null;
                            });
                            _controller.start();
                          },
                          icon: const Icon(Icons.refresh_rounded),
                          label: Text(widget.strings.t('common.retry')),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
