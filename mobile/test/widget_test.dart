import 'package:flutter_test/flutter_test.dart';
import 'package:taptimez_mobile/main.dart';

void main() {
  testWidgets('shows the TapTimez home screen', (tester) async {
    await tester.pumpWidget(const TapTimezApp());

    expect(find.text('TapTimez'), findsOneWidget);
    expect(find.text('PLAY'), findsOneWidget);
  });
}
