import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/constants/app_constants.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/storage/secure_storage.dart';
import 'package:perioxia_crm/data/models/login_result.dart';
import 'package:perioxia_crm/data/models/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(apiClientProvider));
});

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<void> _persistAccessToken(String? token) async {
    if (token != null && token.isNotEmpty) {
      await SecureStorage.write(AppConstants.tokenStorageKey, token);
    }
  }

  Future<LoginResult> login(String email, String password) async {
    final response = await _api.post(
      ApiEndpoints.login,
      data: 'username=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}',
      options: Options(contentType: 'application/x-www-form-urlencoded'),
    );
    final result = LoginResult.fromJson(Map<String, dynamic>.from(response.data as Map));
    if (result.isComplete) {
      await _persistAccessToken(result.accessToken);
    }
    return result;
  }

  Future<User> getMe() async {
    final response = await _api.get(ApiEndpoints.me);
    return User.fromJson(response.data);
  }

  Future<void> logout() async {
    try {
      await _api.post(ApiEndpoints.logout);
    } finally {
      await SecureStorage.delete(AppConstants.platformAccessTokenKey);
      await SecureStorage.delete(AppConstants.tokenStorageKey);
    }
  }

  /// Exchanges credentials for a platform-scoped JWT (`audience=platform`).
  /// Required for `/api/platform/*`. Call after main login when [User.isPlatformAdmin].
  Future<void> obtainPlatformToken(String email, String password) async {
    final response = await _api.post(
      ApiEndpoints.platformAuthLogin,
      data:
          'username=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}',
      options: Options(contentType: 'application/x-www-form-urlencoded'),
    );
    final token = response.data['access_token'] as String?;
    if (token != null && token.isNotEmpty) {
      await SecureStorage.write(AppConstants.platformAccessTokenKey, token);
    }
  }

  Future<void> requestOtp(String email) async {
    await _api.post(ApiEndpoints.requestOtp, data: {'email': email});
  }

  Future<LoginResult> loginOtp(String email, String otpCode) async {
    final response = await _api.post(
      ApiEndpoints.loginOtp,
      data: {'email': email, 'otp_code': otpCode},
    );
    final result = LoginResult.fromJson(Map<String, dynamic>.from(response.data as Map));
    if (result.isComplete) {
      await _persistAccessToken(result.accessToken);
    }
    return result;
  }

  Future<LoginResult> verify2fa({required String mfaToken, required String code}) async {
    final response = await _api.post(
      ApiEndpoints.twoFactorVerify,
      data: {'mfa_token': mfaToken, 'code': code},
    );
    final result = LoginResult.fromJson(Map<String, dynamic>.from(response.data as Map));
    if (result.isComplete) {
      await _persistAccessToken(result.accessToken);
    }
    return result;
  }

  Future<Map<String, dynamic>> twoFactorSetup({String? setupToken}) async {
    final response = await _api.post(
      ApiEndpoints.twoFactorSetup,
      data: {},
      options: setupToken != null && setupToken.isNotEmpty
          ? Options(headers: {'X-Setup-Token': setupToken})
          : null,
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<List<String>> twoFactorConfirm({required String code, String? setupToken}) async {
    final response = await _api.post(
      ApiEndpoints.twoFactorConfirm,
      data: {'code': code},
      options: setupToken != null && setupToken.isNotEmpty
          ? Options(headers: {'X-Setup-Token': setupToken})
          : null,
    );
    final codes = response.data['recovery_codes'];
    if (codes is List) {
      return codes.map((e) => e.toString()).toList();
    }
    return const [];
  }

  Future<Map<String, dynamic>> twoFactorStatus() async {
    final response = await _api.get(ApiEndpoints.twoFactorStatus);
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<void> twoFactorDisable(String password) async {
    await _api.post(ApiEndpoints.twoFactorDisable, data: {'password': password});
  }

  Future<void> forgotPassword(String email) async {
    await _api.post(ApiEndpoints.forgotPassword, data: {'email': email});
  }

  Future<void> resetPassword({
    required String email,
    required String otpCode,
    required String newPassword,
  }) async {
    await _api.post(
      ApiEndpoints.resetPassword,
      data: {
        'email': email,
        'otp_code': otpCode,
        'new_password': newPassword,
      },
    );
  }

  /// New company registration (pending platform approval). Sets session cookie on success.
  Future<Map<String, dynamic>> signup({
    required String email,
    required String fullName,
    required String password,
    String? companyName,
    String? phone,
  }) async {
    final response = await _api.post(
      ApiEndpoints.signup,
      data: {
        'email': email,
        'full_name': fullName,
        'password': password,
        if (companyName != null && companyName.isNotEmpty)
          'company_name': companyName,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  /// Complete invite link. Sets session cookie on success.
  Future<Map<String, dynamic>> acceptInvite({
    required String token,
    required String password,
  }) async {
    final response = await _api.post(
      ApiEndpoints.acceptInvite(token),
      data: {'password': password},
    );
    return Map<String, dynamic>.from(response.data as Map);
  }
}
