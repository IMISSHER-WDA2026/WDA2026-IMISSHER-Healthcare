import 'package:flutter/material.dart';

enum ScannerMode { qr, barcode, face }

const Duration kScannerDebounce = Duration(milliseconds: 1500);

String? extractUserIdFromQr(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  final uuidPattern = RegExp(
    r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
  );

  final uri = Uri.tryParse(trimmed);
  if (uri != null && uri.hasScheme) {
    final queryId = uri.queryParameters['userId'];
    if (queryId != null && queryId.isNotEmpty) return queryId;
    for (final segment in uri.pathSegments.reversed) {
      if (uuidPattern.hasMatch(segment)) return segment;
    }
  }

  final match = uuidPattern.firstMatch(trimmed);
  return match?.group(0);
}

class ScannerOverlayPainter extends CustomPainter {
  final ScannerMode mode;
  final Size screenSize;

  ScannerOverlayPainter({required this.mode, required this.screenSize});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.4)
        ..style = PaintingStyle.fill,
    );

    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    if (mode == ScannerMode.face) {
      final ovalRect = Rect.fromCenter(
        center: Offset(size.width / 2, size.height / 2),
        width: size.width * 0.6,
        height: size.height * 0.7,
      );
      canvas.drawOval(ovalRect, paint..blendMode = BlendMode.clear);

      canvas.drawOval(
        ovalRect,
        Paint()
          ..color = Colors.white70
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke,
      );
    } else {
      final rectSize = size.width * 0.7;
      final targetRect = Rect.fromCenter(
        center: Offset(size.width / 2, size.height / 2),
        width: rectSize,
        height: rectSize,
      );
      canvas.drawRect(targetRect, paint..blendMode = BlendMode.clear);

      canvas.drawRect(
        targetRect,
        Paint()
          ..color = Colors.white70
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke,
      );

      const cornerLength = 20.0;
      final corners = [
        [
          targetRect.topLeft,
          targetRect.topLeft + const Offset(cornerLength, 0),
          targetRect.topLeft + const Offset(0, cornerLength),
        ],
        [
          targetRect.topRight,
          targetRect.topRight + const Offset(-cornerLength, 0),
          targetRect.topRight + const Offset(0, cornerLength),
        ],
        [
          targetRect.bottomLeft,
          targetRect.bottomLeft + const Offset(cornerLength, 0),
          targetRect.bottomLeft + const Offset(0, -cornerLength),
        ],
        [
          targetRect.bottomRight,
          targetRect.bottomRight + const Offset(-cornerLength, 0),
          targetRect.bottomRight + const Offset(0, -cornerLength),
        ],
      ];

      final cornerPaint = Paint()
        ..color = Colors.white
        ..strokeWidth = 3
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      for (final corner in corners) {
        canvas.drawLine(corner[0], corner[1], cornerPaint);
        canvas.drawLine(corner[0], corner[2], cornerPaint);
      }
    }
  }

  @override
  bool shouldRepaint(ScannerOverlayPainter oldDelegate) {
    return oldDelegate.mode != mode || oldDelegate.screenSize != screenSize;
  }
}
