import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/app_constants.dart';
import 'package:perioxia_crm/core/storage/secure_storage.dart';

final platformApiClientProvider = Provider<PlatformApiClient>((ref) {
  return PlatformApiClient(baseUrl: AppConstants.defaultBaseUrl);
});

/// Calls `/api/platform/*` with `Authorization: Bearer <platform_access_token>`.
class PlatformApiClient {
  late final Dio dio;

  PlatformApiClient({required String baseUrl}) {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(_PlatformAuthInterceptor());
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      dio.get<T>(path, queryParameters: queryParameters);

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      dio.post<T>(path,
          data: data, queryParameters: queryParameters, options: options);

  Future<Response<T>> patch<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      dio.patch<T>(path, queryParameters: queryParameters);
}

class _PlatformAuthInterceptor extends Interceptor {
  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final t = await SecureStorage.read(AppConstants.platformAccessTokenKey);
    if (t != null && t.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $t';
    }
    handler.next(options);
  }
}
