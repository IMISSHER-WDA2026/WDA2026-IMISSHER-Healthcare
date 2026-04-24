import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/localization/app_strings.dart';
import 'scanner_overlay_painter.dart';

class QuickScanScreen extends StatefulWidget {
  const QuickScanScreen({super.key, required this.strings});

  final AppStrings strings;

  @override
  State<QuickScanScreen> createState() => _QuickScanScreenState();
}

class _QuickScanScreenState extends State<QuickScanScreen> {
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
    if (last != null && now.difference(last) < kScannerDebounce) {
      return;
    }
    _lastDetectionAt = now;

    _controller.stop();
    setState(() {
      _result = raw;
      _qrUserId = extractUserIdFromQr(raw);
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
            child: MobileScanner(
              controller: _controller,
              onDetect: _result == null ? _onDetect : (_) {},
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _result == null
                  ? Center(
                      child: Text(
                        widget.strings.t('quickScan.desc'),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_qrUserId != null) ...[
                          Text(
                            widget.strings.t('scanner.qrUserId'),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 2),
                          SelectableText(
                            _qrUserId!,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        Text(
                          widget.strings.t('scanner.qrRaw'),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 2),
                        SelectableText(
                          _result!,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 14,
                          ),
                        ),
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
