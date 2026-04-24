import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../chatbot/chatbot_screen.dart';
import '../home/home_screen.dart';
import '../medical/medical_info_screen.dart';
import '../medicines/medicines_screen.dart';
import '../scanner/scanner_screen.dart';
import '../sos/sos_screen.dart';

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
  /// Broadcast to child tabs so they can react to visibility changes
  /// (e.g. ScannerScreen pauses its camera pipeline when off-tab, which
  /// removes a 30fps CPU load during keyboard open/close on other screens).
  final ValueNotifier<int> _selectedTab = ValueNotifier<int>(0);

  @override
  void dispose() {
    _selectedTab.dispose();
    super.dispose();
  }

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

    final pages = [
      HomeScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
        onOpenMedicalInfo: _openMedicalInfo,
        onOpenSos: () => _selectedTab.value = 1,
        onOpenMedicines: () => _selectedTab.value = 3,
      ),
      SosScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
        onOpenMedicalInfo: _openMedicalInfo,
      ),
      ScannerScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
        activeTabIndex: _selectedTab,
        tabIndex: 2,
      ),
      MedicinesScreen(
        strings: widget.strings,
        apiClient: widget.apiClient,
        session: widget.session,
      ),
      ChatbotScreen(strings: widget.strings, apiClient: widget.apiClient),
    ];

    return ValueListenableBuilder<int>(
      valueListenable: _selectedTab,
      builder: (context, selected, _) {
        final appBarTitle = selected == 3
            ? widget.strings.t('medicines.shellTitle')
            : labels[selected];

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
            child: IndexedStack(index: selected, children: pages),
          ),
          bottomNavigationBar: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFD3DDE3))),
            ),
            child: BottomNavigationBar(
              currentIndex: selected,
              type: BottomNavigationBarType.fixed,
              selectedItemColor: const Color(0xFFE11E2B),
              unselectedItemColor: Colors.black87,
              selectedLabelStyle:
                  const TextStyle(fontWeight: FontWeight.w700),
              backgroundColor: Colors.white,
              onTap: (index) => _selectedTab.value = index,
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
      },
    );
  }
}
