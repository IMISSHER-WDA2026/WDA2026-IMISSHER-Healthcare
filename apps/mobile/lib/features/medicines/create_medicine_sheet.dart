import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../scanner/scanner_overlay_painter.dart';

class CreateMedicineSheet extends StatefulWidget {
  const CreateMedicineSheet({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;

  @override
  State<CreateMedicineSheet> createState() => _CreateMedicineSheetState();
}

class _CreateMedicineSheetState extends State<CreateMedicineSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final MobileScannerController _scannerController = MobileScannerController();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _ingredientController = TextEditingController();
  final TextEditingController _barcodeController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _contraController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitController =
      TextEditingController(text: 'viên');

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
    if (last != null && now.difference(last) < kScannerDebounce) return;
    _lastDetectionAt = now;

    await _scannerController.stop();
    setState(() {
      _scanning = true;
      _error = null;
    });

    try {
      final medicine = await widget.apiClient.lookupMedicineByBarcode(
        raw,
        token: widget.session.token,
      );
      if (!mounted) return;

      if (medicine != null) {
        _nameController.text = medicine['name']?.toString() ?? '';
        _ingredientController.text =
            medicine['active_ingredient']?.toString() ?? '';
        _barcodeController.text = raw;
        _descriptionController.text =
            medicine['description']?.toString() ?? '';
        _contraController.text =
            medicine['contraindications']?.toString() ?? '';
        _tabController.animateTo(0);
        setState(() => _error = null);
      } else {
        _barcodeController.text = raw;
        _tabController.animateTo(0);
        setState(() => _error = widget.strings.t('scanner.noResult'));
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
    setState(() {
      _saving = true;
      _error = null;
    });
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
        reminderTime:
            _reminderTime == null ? null : _formatTime(_reminderTime!),
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
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 8),
          TabBar(
            controller: _tabController,
            tabs: [
              Tab(
                text: strings.t('medicines.manualInput'),
                icon: const Icon(Icons.edit_note_rounded),
              ),
              Tab(
                text: strings.t('medicines.scanBarcode'),
                icon: const Icon(Icons.qr_code_scanner_rounded),
              ),
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

  Widget _buildManualForm(
      BuildContext context, double bottomInset, AppStrings strings) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: strings.t('medicines.formName'),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _ingredientController,
            decoration: InputDecoration(
              labelText: strings.t('medicines.formIngredient'),
            ),
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _quantityController,
                decoration: InputDecoration(
                  labelText: strings.t('medicines.formQuantity'),
                ),
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _unitController,
                decoration: InputDecoration(
                  labelText: strings.t('medicines.formUnit'),
                ),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          TextField(
            controller: _barcodeController,
            decoration: InputDecoration(
              labelText: strings.t('medicines.formBarcode'),
            ),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickExpiryDate,
                icon: const Icon(Icons.event_outlined),
                label: Text(
                  _expiresAt == null
                      ? strings.t('medicines.pickExpiryDate')
                      : _formatDate(_expiresAt!),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickReminderTime,
                icon: const Icon(Icons.schedule_outlined),
                label: Text(
                  _reminderTime == null
                      ? strings.t('medicines.pickReminderTime')
                      : _formatTime(_reminderTime!),
                ),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: strings.t('medicines.formDescription'),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _contraController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: strings.t('medicines.formContra'),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFFB71C1C),
                  ),
            ),
          ],
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed:
                    _saving ? null : () => Navigator.of(context).pop(),
                child: Text(strings.t('common.cancel')),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(strings.t('common.add')),
              ),
            ),
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
          child: Text(
            strings.t('medicines.scanning'),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF6B7280),
                ),
          ),
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
