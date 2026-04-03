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
}
