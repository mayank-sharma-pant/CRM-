import 'package:dio/dio.dart';

class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final dynamic data;

  ApiException({this.statusCode, required this.message, this.data});

  factory ApiException.fromDioError(DioException error) {
    final response = error.response;
    final detail = response?.data is Map ? response?.data['detail'] : null;

    return ApiException(
      statusCode: response?.statusCode,
      message: detail?.toString() ?? error.message ?? 'Unknown error',
      data: response?.data,
    );
  }

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isRateLimited => statusCode == 429;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
