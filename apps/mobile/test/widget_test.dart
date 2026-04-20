import 'package:flutter_test/flutter_test.dart';
import 'package:healthcare_mobile/main.dart';

void main() {
  testWidgets('renders auth shell', (WidgetTester tester) async {
    await tester.pumpWidget(const HealthcareApp());
    expect(find.text('Đăng nhập'), findsOneWidget);
  });
}
