import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import 'create_medicine_sheet.dart';

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
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
      if (!mounted) return;

      setState(() {
        _items = items
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = widget.strings.t('common.error'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openCreateSheet() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateMedicineSheet(
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
            Expanded(
              child: ValueListenableBuilder<TextEditingValue>(
                valueListenable: _searchController,
                builder: (context, value, _) {
                  final keyword = value.text.trim().toLowerCase();
                  final filteredItems = keyword.isEmpty
                      ? _items
                      : _items.where((medicine) {
                          final name =
                              medicine['name']?.toString().toLowerCase() ?? '';
                          final ingredient = medicine['active_ingredient']
                                  ?.toString()
                                  .toLowerCase() ??
                              '';
                          return name.contains(keyword) ||
                              ingredient.contains(keyword);
                        }).toList();

                  return _FilteredMedicinesView(
                    strings: widget.strings,
                    items: filteredItems,
                    loading: _loading,
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
}

class _FilteredMedicinesView extends StatelessWidget {
  const _FilteredMedicinesView({
    required this.strings,
    required this.items,
    required this.loading,
  });

  final AppStrings strings;
  final List<Map<String, dynamic>> items;
  final bool loading;

  DateTime? _tryParseDate(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    try {
      return DateTime.parse(value);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final dayStart = DateTime(today.year, today.month, today.day);

    final expiredCount = items.where((item) {
      final date = _tryParseDate(item['expiresAt']?.toString());
      return date != null && date.isBefore(dayStart);
    }).length;

    final nearExpiryCount = items.where((item) {
      final date = _tryParseDate(item['expiresAt']?.toString());
      if (date == null) return false;
      if (date.isBefore(dayStart)) return false;
      return date.difference(dayStart).inDays <= 30;
    }).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: SizedBox(
              width: double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.t('medicines.currentMedicines'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                      '${strings.t('medicines.totalTypes')}: ${items.length}'),
                  Text('${strings.t('medicines.expired')}: $expiredCount'),
                  Text(
                      '${strings.t('medicines.nearExpiry')}: $nearExpiryCount'),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: items.isEmpty && !loading
              ? Center(
                  child: Text(
                    strings.t('medicines.emptyMine'),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: const Color(0xFF334155),
                        ),
                    textAlign: TextAlign.center,
                  ),
                )
              : ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final medicine = items[index];
                    final name = medicine['name']?.toString() ??
                        strings.t('medicines.unknown');
                    final ingredient =
                        medicine['active_ingredient']?.toString() ?? '';
                    final quantity = medicine['quantity'];
                    final quantityText = quantity == null
                        ? strings.t('common.notProvided')
                        : quantity.toString();
                    final unit = medicine['unit']?.toString();
                    final expiresAt = medicine['expiresAt']?.toString();
                    final reminderTime = medicine['reminderTime']?.toString();

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
                              '${strings.t('medicines.quantity')}: $quantityText ${unit ?? strings.t('medicines.defaultUnit')}',
                            ),
                            Text(
                              '${strings.t('medicines.expiryDate')}: ${expiresAt ?? strings.t('common.notProvided')}',
                            ),
                            Text(
                              '${strings.t('medicines.reminderTime')}: ${reminderTime ?? strings.t('common.notProvided')}',
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
