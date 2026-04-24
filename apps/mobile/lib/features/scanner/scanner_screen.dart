import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';
import 'scanner_overlay_painter.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({
    super.key,
    required this.strings,
    required this.apiClient,
    this.session,
    this.activeTabIndex,
    this.tabIndex = 2,
  });

  final AppStrings strings;
  final ApiClient apiClient;
  final AuthSession? session;

  /// Optional listenable for the current tab index. When provided, the scanner
  /// stops both cameras whenever the active tab isn't its own, cutting the
  /// 30fps camera pipeline while the user is on another tab (the main source
  /// of CPU load during keyboard open/close on other screens).
  final ValueListenable<int>? activeTabIndex;
  final int tabIndex;

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen>
    with WidgetsBindingObserver {
  late final MobileScannerController _cameraController;
  late final MobileScannerController _faceCameraController;
  ScannerMode _mode = ScannerMode.qr;
  bool _isCameraActive = true;
  String? _scannedValue;
  Map<String, dynamic>? _result;
  String? _qrUserId;
  String? _error;
  bool _loading = false;

  DateTime? _lastDetectionAt;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _cameraController = MobileScannerController(
      formats: const [BarcodeFormat.qrCode],
    );
    _faceCameraController = MobileScannerController(
      facing: CameraFacing.front,
      formats: const [],
    );
    widget.activeTabIndex?.addListener(_onTabVisibilityChanged);
  }

  @override
  void dispose() {
    widget.activeTabIndex?.removeListener(_onTabVisibilityChanged);
    WidgetsBinding.instance.removeObserver(this);
    _debounceTimer?.cancel();
    _cameraController.dispose();
    _faceCameraController.dispose();
    super.dispose();
  }

  bool get _isVisibleTab =>
      widget.activeTabIndex == null ||
      widget.activeTabIndex!.value == widget.tabIndex;

  void _onTabVisibilityChanged() {
    if (_isVisibleTab) {
      _resumeActiveCamera();
    } else {
      _pauseCameras();
    }
  }

  void _pauseCameras() {
    _cameraController.stop();
    _faceCameraController.stop();
  }

  void _resumeActiveCamera() {
    if (_mode == ScannerMode.face) {
      _faceCameraController.start();
    } else if (_isCameraActive && _scannedValue == null) {
      _cameraController.start();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        if (_isVisibleTab) _resumeActiveCamera();
        break;
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        _pauseCameras();
        break;
      case AppLifecycleState.inactive:
        break;
    }
  }

  bool _shouldAcceptDetection() {
    final now = DateTime.now();
    final last = _lastDetectionAt;
    if (last != null && now.difference(last) < kScannerDebounce) {
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

    if (_mode == ScannerMode.qr) {
      unawaited(_handleQr(raw));
    }
  }

  Future<void> _handleQr(String raw) async {
    await _cameraController.stop();
    if (!mounted) return;
    setState(() {
      _isCameraActive = false;
      _scannedValue = raw;
      _qrUserId = extractUserIdFromQr(raw);
      _result = null;
      _error = null;
    });
  }

  Future<void> _captureFace() async {
    if (_loading) return;
    final session = widget.session;
    if (session == null) {
      setState(() {
        _error = widget.strings.t('errors.unauthorized');
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
      _scannedValue = null;
    });

    await _faceCameraController.stop();

    try {
      final picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 85,
      );

      if (photo == null) {
        if (mounted) setState(() => _loading = false);
        if (_isVisibleTab) await _faceCameraController.start();
        return;
      }

      final result = await widget.apiClient.recognizeFace(
        token: session.token,
        userId: session.userId,
        imageFile: File(photo.path),
        source: 'camera',
      );

      if (!mounted) return;
      setState(() {
        _result = result;
        _scannedValue = photo.path;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = widget.strings.t('common.error'));
    } finally {
      if (mounted) setState(() => _loading = false);
      if (_mode == ScannerMode.face && _isVisibleTab) {
        await _faceCameraController.start();
      }
    }
  }

  Future<void> _switchMode(ScannerMode next) async {
    if (_mode == next) return;
    _debounceTimer?.cancel();
    _lastDetectionAt = null;

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

    if (!_isVisibleTab) return;

    try {
      if (next == ScannerMode.face) {
        await _faceCameraController.start();
      } else {
        await _cameraController.start();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = widget.strings.t('common.error'));
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
    if (_mode != ScannerMode.face && _isVisibleTab) {
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
            onDetect: (_) {},
          ),
          CustomPaint(
            painter: ScannerOverlayPainter(
              mode: _mode,
              screenSize: MediaQuery.of(context).size,
            ),
            size: Size.infinite,
          ),
          Positioned(
            bottom: 12,
            right: 12,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton(
                  backgroundColor: const Color(0xFFE11E2B),
                  foregroundColor: Colors.white,
                  onPressed: _loading ? null : _captureFace,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.photo_camera_rounded),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  backgroundColor: const Color(0xFF0D5C7A),
                  foregroundColor: Colors.white,
                  onPressed: () async {
                    await _faceCameraController.switchCamera();
                  },
                  child: const Icon(Icons.flip_camera_ios),
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
              const Icon(Icons.check_circle_outline,
                  color: Colors.green, size: 48),
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
                label: Text(
                  strings.t('common.retry'),
                  style: const TextStyle(color: Colors.white),
                ),
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
        CustomPaint(
          painter: ScannerOverlayPainter(
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
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (_qrUserId != null) ...[
                Text(strings.t('scanner.qrUserId'),
                    style: Theme.of(context).textTheme.bodySmall),
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
              Text(strings.t('scanner.qrRaw'),
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 2),
              SelectableText(
                _scannedValue!,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
              ),
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
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: const Color(0xFF6B7280)),
          textAlign: TextAlign.center,
        ),
      );
    }

    if (_mode == ScannerMode.face) {
      final matchedUserId =
          result['matchedUserId']?.toString() ?? result['userId']?.toString();
      final similarity = result['similarity'];
      final status = result['status']?.toString() ?? result['match']?.toString();
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                strings.t('scanner.resultTitle'),
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (status != null) Text('Status: $status'),
              if (matchedUserId != null) ...[
                const SizedBox(height: 4),
                SelectableText(
                  'User: $matchedUserId',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                ),
              ],
              if (similarity is num) ...[
                const SizedBox(height: 4),
                Text('Similarity: ${(similarity * 100).toStringAsFixed(1)}%'),
              ],
            ],
          ),
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
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (result['name'] != null)
              Text(result['name'].toString(),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            if (result['active_ingredient'] != null) ...[
              const SizedBox(height: 4),
              Text(result['active_ingredient'].toString()),
            ],
            if (result['description'] != null) ...[
              const SizedBox(height: 4),
              Text(result['description'].toString()),
            ],
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
