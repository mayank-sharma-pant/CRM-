import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/platform_api_client.dart';

final crmPlatformRepositoryProvider = Provider<CrmPlatformRepository>((ref) {
  return CrmPlatformRepository(ref.read(platformApiClientProvider));
});

class CrmPlatformRepository {
  final PlatformApiClient _api;

  CrmPlatformRepository(this._api);

  /// `GET /api/platform/auth/me` — validates platform JWT and returns operator profile.
  Future<Map<String, dynamic>> getPlatformMe() async {
    final r = await _api.get(ApiEndpoints.platformAuthMe);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getMetricsDashboard() async {
    final r = await _api.get(ApiEndpoints.platformMetricsDashboard);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listCompanies({String? status}) async {
    final r = await _api.get(ApiEndpoints.platformCompanies,
        queryParameters: {if (status != null && status.isNotEmpty) 'status': status});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listPendingCompanies() async {
    final r = await _api.get(ApiEndpoints.platformCompaniesPending);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getCompany(int id) async {
    final r = await _api.get(ApiEndpoints.platformCompany(id));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> approveCompany(int id) async {
    final r = await _api.post(ApiEndpoints.platformCompanyApprove(id));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> rejectCompany(int id, {String? reason}) async {
    final r = await _api.post(
      ApiEndpoints.platformCompanyReject(id),
      queryParameters: {if (reason != null && reason.isNotEmpty) 'reason': reason},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> updateCompanyStatus(int id, String newStatus) async {
    final r = await _api.patch(
      ApiEndpoints.platformCompanyStatus(id),
      queryParameters: {'new_status': newStatus},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getPlans() async {
    final r = await _api.get(ApiEndpoints.platformPlans);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getLogs({int days = 7, int limit = 100}) async {
    final r = await _api.get(ApiEndpoints.platformLogs, queryParameters: {
      'days': days,
      'limit': limit,
    });
    return Map<String, dynamic>.from(r.data);
  }
}
