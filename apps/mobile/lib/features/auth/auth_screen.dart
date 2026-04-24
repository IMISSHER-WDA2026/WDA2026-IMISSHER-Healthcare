import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../scanner/quick_scan_screen.dart';

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

      if (!mounted) return;
      widget.onAuthenticated(session);
    } on ApiException catch (error) {
      if (!mounted) return;

      String localizedError = error.message;
      final errorMsg = error.message.toLowerCase();

      if (errorMsg.contains('invalid') && errorMsg.contains('credential')) {
        localizedError = widget.strings.t('errors.invalidCredentials');
      } else if (errorMsg.contains('not found') ||
          errorMsg.contains('does not exist')) {
        localizedError = widget.strings.t('errors.userNotFound');
      } else if (errorMsg.contains('already') && errorMsg.contains('exist')) {
        localizedError = widget.strings.t('errors.emailExists');
      } else if (errorMsg.contains('unauthorized')) {
        localizedError = widget.strings.t('errors.unauthorized');
      } else if (errorMsg.contains('server') || errorMsg.contains('internal')) {
        localizedError = widget.strings.t('errors.serverError');
      }

      setState(() => _error = localizedError);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = widget.strings.t('common.error'));
    } finally {
      if (mounted) setState(() => _loading = false);
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
                        style: Theme.of(context)
                            .textTheme
                            .headlineMedium
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
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
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
              builder: (_) => QuickScanScreen(strings: widget.strings),
            ),
          );
        },
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: Text(widget.strings.t('quickScan.title')),
      ),
    );
  }
}
