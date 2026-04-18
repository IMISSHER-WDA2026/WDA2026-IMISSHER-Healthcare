import 'package:flutter_test/flutter_test.dart';
import 'package:imissher_mobile/main.dart';

void main() {
  testWidgets('renders auth shell', (WidgetTester tester) async {
    await tester.pumpWidget(const ImissherApp());
    expect(find.text('Đăng nhập / Đăng ký'), findsOneWidget);
  });
}
