import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Store-submission invariants. A careless version or app-id change is rejected
/// by Play / App Store review, not by the compiler — pin the shape here so it
/// fails a test instead of a reviewer. See docs/superpowers/specs/
/// 2026-08-26-phase7-store-mobile-design.md (7.3).
void main() {
  final pubspec = File('pubspec.yaml').readAsStringSync();

  test('pubspec version is a valid versionName+versionCode', () {
    final match =
        RegExp(r'^version:\s*(.+)$', multiLine: true).firstMatch(pubspec);
    expect(match, isNotNull, reason: 'no version: line in pubspec.yaml');
    final version = match!.group(1)!.trim();
    expect(
      RegExp(r'^\d+\.\d+\.\d+\+\d+$').hasMatch(version),
      isTrue,
      reason: 'version "$version" must be like 1.0.0+1 (name+code)',
    );
  });

  test('pubspec name matches the documented bundle id', () {
    final match =
        RegExp(r'^name:\s*(.+)$', multiLine: true).firstMatch(pubspec);
    expect(match, isNotNull, reason: 'no name: line in pubspec.yaml');
    // With `flutter create --org com.perioxia`, this yields
    // com.perioxia.perioxia_crm (see store/STORE_RELEASE.md).
    expect(match!.group(1)!.trim(), 'perioxia_crm');
  });
}
