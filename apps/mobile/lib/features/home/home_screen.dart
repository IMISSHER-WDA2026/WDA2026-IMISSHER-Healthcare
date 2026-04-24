import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../../widgets/asset_icon.dart';
import '../../widgets/section_title.dart';
import '../../widgets/summary_card.dart';

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

      if (!mounted) return;

      setState(() {
        _myMedicines = items
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _medicineError = error.message);
    } catch (_) {
      if (mounted) {
        setState(() => _medicineError = widget.strings.t('common.error'));
      }
    } finally {
      if (mounted) setState(() => _loadingMedicines = false);
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
          final name = item['name']?.toString() ?? strings.t('medicines.unknown');
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
          SectionTitle(
            title: strings.t('home.reminders'),
            trailing: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(strings.t('home.reminderComingSoon')),
                  ),
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
                      const AssetIcon(
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
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
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

              final card1 = SummaryCard(
                title: strings.t('home.medicalCardTitle'),
                icon: const AssetIcon(
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

              final card2 = SummaryCard(
                title: strings.t('home.medicineCardTitle'),
                icon: const AssetIcon(
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
              icon: const AssetIcon(
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
