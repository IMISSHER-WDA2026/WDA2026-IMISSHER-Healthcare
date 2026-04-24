import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import '../../widgets/asset_icon.dart';
import '../../widgets/info_line.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    required this.session,
    required this.onOpenMedicalInfo,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession session;
  final VoidCallback onOpenMedicalInfo;

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final TextEditingController _noteController = TextEditingController();
  final GlobalKey _qrKey = GlobalKey();
  bool _sending = false;
  bool _sharingQr = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _shareQrImage(String sosWebUrl) async {
    if (_sharingQr) return;
    setState(() => _sharingQr = true);
    try {
      final boundary = _qrKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) {
        throw StateError('QR boundary not ready');
      }

      final ui.Image image = await boundary.toImage(pixelRatio: 3);
      final ByteData? byteData =
          await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        throw StateError('Failed to encode QR image');
      }

      final Uint8List pngBytes = byteData.buffer.asUint8List();
      final Directory tmp = await getTemporaryDirectory();
      final String path =
          '${tmp.path}/sos-qr-${DateTime.now().millisecondsSinceEpoch}.png';
      final File file = await File(path).writeAsBytes(pngBytes, flush: true);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/png')],
        text: sosWebUrl,
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.strings.t('common.error'))),
      );
    } finally {
      if (mounted) setState(() => _sharingQr = false);
    }
  }

  Future<void> _send() async {
    setState(() => _sending = true);

    try {
      await widget.apiClient.createSos(
        token: widget.session.token,
        userId: widget.session.userId,
        note: _noteController.text,
      );

      if (!mounted) return;

      _noteController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.strings.t('sos.success'))),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _sending = false);
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

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(widget.strings.t('sos.phoneCopied'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    final contacts = widget.session.emergencyContacts;
    final sosWebUrl =
        'https://your-sos-web.vercel.app/?userId=${widget.session.userId}';

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFE11E2B),
        foregroundColor: Colors.white,
        onPressed: widget.onOpenMedicalInfo,
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: Text(strings.t('medical.addContact')),
      ),
      body: ListView(
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
                                icon: const Icon(
                                  Icons.camera_alt,
                                  size: 14,
                                  color: Colors.white,
                                ),
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content:
                                          Text(strings.t('common.loading')),
                                    ),
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
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(strings.t('common.loading')),
                                  ),
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
                  InfoLine(
                    label: strings.t('medical.fullName'),
                    value: widget.session.fullName,
                  ),
                  InfoLine(
                    label: strings.t('medical.phone'),
                    value: widget.session.phone ??
                        strings.t('common.notProvided'),
                  ),
                  InfoLine(
                    label: strings.t('medical.bloodType'),
                    value: widget.session.bloodType ??
                        strings.t('common.notProvided'),
                  ),
                  InfoLine(
                    label: strings.t('medical.allergies'),
                    value: widget.session.allergies ??
                        strings.t('common.notProvided'),
                  ),
                  InfoLine(
                    label: strings.t('medical.chronicConditions'),
                    value: widget.session.chronicConditions ??
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
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(
                                      color: const Color(0xFF111827),
                                    ),
                                children: [
                                  const TextSpan(
                                    text: 'User ID: ',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
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
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    strings.t('sos.qrDesc'),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF6B7280),
                        ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: RepaintBoundary(
                      key: _qrKey,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        color: Colors.white,
                        child: QrImageView(
                          data: sosWebUrl,
                          version: QrVersions.auto,
                          size: 200,
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _sharingQr
                          ? null
                          : () => _shareQrImage(sosWebUrl),
                      icon: _sharingQr
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.share_outlined),
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
                      const AssetIcon(
                        assetPath: 'assets/design/call_icon.png',
                        fallbackIcon: Icons.call,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        strings.t('sos.emergencyContacts'),
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
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
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(color: const Color(0xFF111827)),
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
                    decoration:
                        InputDecoration(labelText: strings.t('sos.note')),
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
                              child:
                                  CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(strings.t('sos.send')),
                    ),
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
