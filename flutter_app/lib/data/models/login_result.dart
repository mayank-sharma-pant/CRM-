import 'package:perioxia_crm/data/models/user.dart';

class LoginResult {
  final User? user;
  final String? accessToken;
  final bool mfaRequired;
  final String? mfaToken;
  final bool mfaSetupRequired;
  final String? setupToken;

  const LoginResult({
    this.user,
    this.accessToken,
    this.mfaRequired = false,
    this.mfaToken,
    this.mfaSetupRequired = false,
    this.setupToken,
  });

  bool get isComplete =>
      !mfaRequired &&
      !mfaSetupRequired &&
      user != null &&
      (accessToken != null && accessToken!.isNotEmpty);

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    final userRaw = json['user'];
    return LoginResult(
      accessToken: json['access_token'] as String?,
      mfaRequired: json['mfa_required'] == true,
      mfaToken: json['mfa_token'] as String?,
      mfaSetupRequired: json['mfa_setup_required'] == true,
      setupToken: json['setup_token'] as String?,
      user: userRaw is Map
          ? User.fromJson(Map<String, dynamic>.from(userRaw))
          : null,
    );
  }
}
