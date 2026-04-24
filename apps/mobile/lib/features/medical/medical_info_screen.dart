import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../../widgets/section_title.dart';

class EmergencyContactDraft {
  EmergencyContactDraft({String? name, String? phone})
      : nameController = TextEditingController(text: name ?? ''),
        phoneController = TextEditingController(text: phone ?? '');

  final TextEditingController nameController;
  final TextEditingController phoneController;

  void dispose() {
    nameController.dispose();
    phoneController.dispose();
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
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
  ];

  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _allergiesController;
  late final TextEditingController _chronicConditionsController;

  String? _selectedBloodType;
  bool _saving = false;
  final List<EmergencyContactDraft> _contactDrafts = [];

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.session.fullName);
    _phoneController = TextEditingController(text: widget.session.phone ?? '');
    _allergiesController =
        TextEditingController(text: widget.session.allergies ?? '');
    _chronicConditionsController =
        TextEditingController(text: widget.session.chronicConditions ?? '');

    final normalizedBlood = widget.session.bloodType?.trim();
    _selectedBloodType =
        _bloodTypes.contains(normalizedBlood) ? normalizedBlood : null;

    final contacts = widget.session.emergencyContacts;
    if (contacts.isEmpty) {
      _contactDrafts.add(EmergencyContactDraft());
    } else {
      for (final contact in contacts) {
        _contactDrafts.add(
          EmergencyContactDraft(name: contact.name, phone: contact.phone),
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
    if (text == null || text.isEmpty || text == 'null') return null;
    return text;
  }

  List<EmergencyContact> _buildContacts() {
    return _contactDrafts
        .map((draft) => EmergencyContact(
              name: draft.nameController.text.trim(),
              phone: draft.phoneController.text.trim(),
            ))
        .where((c) => c.name.isNotEmpty && c.phone.isNotEmpty)
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

    setState(() => _saving = true);

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

      if (!mounted) return;

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
          'emergencyContactName':
              _normalizeOptional(body['emergencyContactName']),
          'emergencyContactPhone':
              _normalizeOptional(body['emergencyContactPhone']),
          'emergencyContacts': body['emergencyContacts'],
        },
      });

      Navigator.of(context).pop(updatedSession);
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _addContact() {
    if (_contactDrafts.length >= 5) return;
    setState(() => _contactDrafts.add(EmergencyContactDraft()));
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
                        .map((b) =>
                            DropdownMenuItem(value: b, child: Text(b)))
                        .toList(),
                    onChanged: (value) =>
                        setState(() => _selectedBloodType = value),
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
                  SectionTitle(
                    title: strings.t('medical.emergencyContacts'),
                    trailing: TextButton.icon(
                      onPressed:
                          _contactDrafts.length >= 5 ? null : _addContact,
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
                  for (var i = 0; i < _contactDrafts.length; i++) ...[
                    _EmergencyContactForm(
                      index: i,
                      strings: strings,
                      draft: _contactDrafts[i],
                      onRemove: () => _removeContact(i),
                    ),
                    if (i != _contactDrafts.length - 1)
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
  final EmergencyContactDraft draft;
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
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
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
