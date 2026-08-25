import 'package:flutter_test/flutter_test.dart';
import 'package:perioxia_crm/data/models/login_result.dart';

void main() {
  test('plain login is complete', () {
    final r = LoginResult.fromJson({
      'access_token': 'tok',
      'user': {
        'id': 1,
        'email': 'a@b.com',
        'full_name': 'A',
        'role': 'sales',
        'company_id': 9,
      },
    });
    expect(r.isComplete, isTrue);
    expect(r.user!.email, 'a@b.com');
    expect(r.mfaRequired, isFalse);
  });

  test('mfa challenge is not a session', () {
    final r = LoginResult.fromJson({
      'mfa_required': true,
      'mfa_token': 'mfa-jwt',
      'token_type': 'bearer',
    });
    expect(r.isComplete, isFalse);
    expect(r.mfaRequired, isTrue);
    expect(r.mfaToken, 'mfa-jwt');
    expect(r.user, isNull);
  });

  test('forced setup is not a session', () {
    final r = LoginResult.fromJson({
      'mfa_setup_required': true,
      'setup_token': 'setup-jwt',
    });
    expect(r.isComplete, isFalse);
    expect(r.mfaSetupRequired, isTrue);
    expect(r.setupToken, 'setup-jwt');
  });
}
