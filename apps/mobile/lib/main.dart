import 'package:flutter/material.dart';

import 'core/localization/app_strings.dart';
import 'core/network/api_client.dart';

const String apiBaseUrl = String.fromEnvironment(
  'IMISSHER_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

void main() {
  runApp(const ImissherApp());
}

class ImissherApp extends StatefulWidget {
  const ImissherApp({super.key});

  @override
  State<ImissherApp> createState() => _ImissherAppState();
}

class _ImissherAppState extends State<ImissherApp> {
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

    return MaterialApp(
      title: strings.t('app.title'),
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFDC2626)),
        scaffoldBackgroundColor: const Color(0xFFF3F8FC),
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

  bool _isRegister = true;
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
      setState(() {
        _error = error.message;
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
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.strings.t('auth.title')),
        actions: [
          TextButton(
            onPressed: widget.onLanguageToggle,
            child: Text(widget.strings.t('language.toggle')),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: widget.strings.t('auth.email'),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: widget.strings.t('auth.password'),
              ),
              obscureText: true,
            ),
            if (_isRegister) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _fullNameController,
                decoration: InputDecoration(
                  labelText: widget.strings.t('auth.fullName'),
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        _isRegister
                            ? widget.strings.t('auth.register')
                            : widget.strings.t('auth.login'),
                      ),
              ),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _isRegister = !_isRegister;
                });
              },
              child: Text(
                _isRegister
                    ? widget.strings.t('auth.login')
                    : widget.strings.t('auth.register'),
              ),
            ),
          ],
        ),
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
    final pages = [
      HomeScreen(
        strings: widget.strings,
        session: widget.session,
        onOpenMedicalInfo: _openMedicalInfo,
      ),
      SosScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
      ),
      ScannerScreen(strings: widget.strings, apiClient: widget.apiClient),
      MedicinesScreen(strings: widget.strings, apiClient: widget.apiClient),
      ChatbotScreen(strings: widget.strings, apiClient: widget.apiClient),
    ];

    final labels = [
      widget.strings.t('tabs.home'),
      widget.strings.t('tabs.sos'),
      widget.strings.t('tabs.scanner'),
      widget.strings.t('tabs.medicines'),
      widget.strings.t('tabs.chatbot'),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(labels[_selectedTab]),
        actions: [
          TextButton(
            onPressed: widget.onLanguageToggle,
            child: Text(widget.strings.t('language.toggle')),
          ),
          IconButton(
            tooltip: widget.strings.t('auth.logout'),
            icon: const Icon(Icons.logout),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: IndexedStack(index: _selectedTab, children: pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        onTap: (index) {
          setState(() {
            _selectedTab = index;
          });
        },
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.home),
            label: labels[0],
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.warning),
            label: labels[1],
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.qr_code_scanner),
            label: labels[2],
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.medical_services),
            label: labels[3],
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.chat),
            label: labels[4],
          ),
        ],
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.strings,
    required this.session,
    required this.onOpenMedicalInfo,
  });

  final AppStrings strings;
  final AuthSession session;
  final VoidCallback onOpenMedicalInfo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            strings.t('home.welcome'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text('${strings.t('auth.fullName')}: ${session.fullName}'),
          Text('${strings.t('auth.email')}: ${session.email}'),
          Text(
            '${strings.t('home.bloodType')}: '
            '${session.bloodType ?? strings.t('common.notProvided')}',
          ),
          Text(
            '${strings.t('home.emergencyContact')}: '
            '${session.emergencyContactPhone ?? strings.t('common.notProvided')}',
          ),
          const SizedBox(height: 16),
          Text(strings.t('home.medicalInfo')),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: onOpenMedicalInfo,
            child: Text(strings.t('home.openMedicalInfo')),
          ),
        ],
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
  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _bloodTypeController;
  late final TextEditingController _allergiesController;
  late final TextEditingController _chronicConditionsController;
  late final TextEditingController _emergencyContactNameController;
  late final TextEditingController _emergencyContactPhoneController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.session.fullName);
    _phoneController = TextEditingController(text: widget.session.phone ?? '');
    _bloodTypeController = TextEditingController(
      text: widget.session.bloodType ?? '',
    );
    _allergiesController = TextEditingController(
      text: widget.session.allergies ?? '',
    );
    _chronicConditionsController = TextEditingController(
      text: widget.session.chronicConditions ?? '',
    );
    _emergencyContactNameController = TextEditingController(
      text: widget.session.emergencyContactName ?? '',
    );
    _emergencyContactPhoneController = TextEditingController(
      text: widget.session.emergencyContactPhone ?? '',
    );
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _bloodTypeController.dispose();
    _allergiesController.dispose();
    _chronicConditionsController.dispose();
    _emergencyContactNameController.dispose();
    _emergencyContactPhoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    String? normalize(String value) {
      final text = value.trim();
      if (text.isEmpty) {
        return null;
      }
      return text;
    }

    setState(() {
      _saving = true;
    });

    try {
      final body = await widget.apiClient.updateMe(
        token: widget.session.token,
        fullName: _fullNameController.text.trim(),
        phone: normalize(_phoneController.text),
        bloodType: normalize(_bloodTypeController.text),
        allergies: normalize(_allergiesController.text),
        chronicConditions: normalize(_chronicConditionsController.text),
        emergencyContactName: normalize(_emergencyContactNameController.text),
        emergencyContactPhone: normalize(_emergencyContactPhoneController.text),
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(
        AuthSession(
          token: widget.session.token,
          userId: body['id']?.toString() ?? widget.session.userId,
          email: body['email']?.toString() ?? widget.session.email,
          fullName:
              body['fullName']?.toString() ?? _fullNameController.text.trim(),
          phone: body['phone']?.toString(),
          bloodType: body['bloodType']?.toString(),
          allergies: body['allergies']?.toString(),
          chronicConditions: body['chronicConditions']?.toString(),
          emergencyContactName: body['emergencyContactName']?.toString(),
          emergencyContactPhone: body['emergencyContactPhone']?.toString(),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.strings.t('medical.title'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _fullNameController,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.fullName'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.phone'),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _bloodTypeController,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.bloodType'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _allergiesController,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.allergies'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _chronicConditionsController,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.chronicConditions'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emergencyContactNameController,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.emergencyContactName'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emergencyContactPhoneController,
              decoration: InputDecoration(
                labelText: widget.strings.t('medical.emergencyContactPhone'),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(widget.strings.t('medical.update')),
              ),
            ),
          ],
        ),
      ),
    );
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

      if (mounted) {
        _noteController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.strings.t('sos.success'))),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.strings.t('sos.title'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: widget.strings.t('sos.note'),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _sending ? null : _send,
            child: _sending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.strings.t('sos.send')),
          ),
        ],
      ),
    );
  }
}

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({
    super.key,
    required this.strings,
    required this.apiClient,
  });

  final AppStrings strings;
  final ApiClient apiClient;

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final TextEditingController _barcodeController = TextEditingController();
  Map<String, dynamic>? _result;
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _barcodeController.dispose();
    super.dispose();
  }

  Future<void> _lookupBarcode() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await widget.apiClient.lookupMedicineByBarcode(
        _barcodeController.text,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _result = response;
        if (response == null) {
          _error = widget.strings.t('scanner.noResult');
        }
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _result = null;
        _error = error.message;
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
    final result = _result;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.strings.t('scanner.title'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(widget.strings.t('scanner.desc')),
          const SizedBox(height: 12),
          TextField(
            controller: _barcodeController,
            decoration: InputDecoration(
              labelText: widget.strings.t('scanner.barcodeLabel'),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loading ? null : _lookupBarcode,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.strings.t('scanner.lookup')),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (result != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.strings.t('scanner.resultTitle'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(result['name']?.toString() ?? '-'),
                    const SizedBox(height: 4),
                    Text(result['active_ingredient']?.toString() ?? ''),
                    const SizedBox(height: 4),
                    Text(result['description']?.toString() ?? ''),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class MedicinesScreen extends StatefulWidget {
  const MedicinesScreen({
    super.key,
    required this.strings,
    required this.apiClient,
  });

  final AppStrings strings;
  final ApiClient apiClient;

  @override
  State<MedicinesScreen> createState() => _MedicinesScreenState();
}

class _MedicinesScreenState extends State<MedicinesScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await widget.apiClient.getMedicines();
      if (!mounted) {
        return;
      }
      setState(() {
        _items = items;
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
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

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.strings.t('medicines.title'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              TextButton(
                onPressed: _load,
                child: Text(widget.strings.t('medicines.refresh')),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loading) const LinearProgressIndicator(),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: _items.length,
              itemBuilder: (context, index) {
                final medicine = _items[index] as Map<String, dynamic>;
                final name = medicine['name']?.toString() ?? 'Unknown';
                final ingredient =
                    medicine['active_ingredient']?.toString() ?? '';
                return Card(
                  child: ListTile(
                    title: Text(name),
                    subtitle: ingredient.isEmpty ? null : Text(ingredient),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
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
  String _response = '';
  bool _loading = false;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) {
      return;
    }

    setState(() {
      _loading = true;
    });

    try {
      final body = await widget.apiClient.askChatbot(message);
      if (!mounted) {
        return;
      }
      setState(() {
        _response = body['answer']?.toString() ?? '';
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _response = error.message;
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

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.strings.t('chatbot.title'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _messageController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: widget.strings.t('chatbot.message'),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loading ? null : _send,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.strings.t('chatbot.send')),
          ),
          const SizedBox(height: 16),
          Expanded(child: SingleChildScrollView(child: Text(_response))),
        ],
      ),
    );
  }
}
