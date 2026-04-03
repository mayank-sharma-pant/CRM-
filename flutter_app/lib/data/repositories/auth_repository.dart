import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/constants/app_constants.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/storage/secure_storage.dart';
import 'package:perioxia_crm/data/models/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(apiClientProvider));
});

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<User> login(String email, String password) async {
    final response = await _api.post(
      ApiEndpoints.login,
      data: 'username=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}',
      options: Options(contentType: 'application/x-www-form-urlencoded'),
    );
    return User.fromJson(response.data['user']);
  }

  Future<User> getMe() async {
    final response = await _api.get(ApiEndpoints.me);
    return User.fromJson(response.data);
  }

  Future<void> logout() async {
    await _api.post(ApiEndpoints.logout);
    await SecureStorage.delete(AppConstants.platformAccessTokenKey);
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

  Future<User> loginOtp(String email, String otpCode) async {
    final response = await _api.post(
      ApiEndpoints.loginOtp,
      data: {'email': email, 'otp_code': otpCode},
    );
    return User.fromJson(response.data['user']);
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
