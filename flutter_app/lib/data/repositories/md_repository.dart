import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';

final mdRepositoryProvider = Provider<MdRepository>((ref) {
  return MdRepository(ref.read(apiClientProvider));
});

class MdRepository {
  final ApiClient _api;

  MdRepository(this._api);

  Future<Map<String, dynamic>> getDashboard() async {
    final r = await _api.get(ApiEndpoints.mdDashboard);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getRevenue() async {
    final r = await _api.get(ApiEndpoints.mdRevenue);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getSales({String period = '30d'}) async {
    final r = await _api.get(ApiEndpoints.mdSales,
        queryParameters: {'period': period});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getMonitoring() async {
    final r = await _api.get(ApiEndpoints.mdMonitoring);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeams() async {
    final r = await _api.get(ApiEndpoints.mdTeams);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getLeads({
    String? status,
    String? team,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.mdLeads, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
      if (team != null && team.isNotEmpty) 'team': team,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getClients({
    String? status,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.mdClients, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> employeeLookup({
    String? search,
    String? team,
    String? role,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.mdEmployeeLookup, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (search != null && search.isNotEmpty) 'search': search,
      if (team != null && team.isNotEmpty) 'team': team,
      if (role != null && role.isNotEmpty) 'role': role,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getEmployeeDetail(int userId) async {
    final r = await _api.get(ApiEndpoints.mdEmployeeDetail(userId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getInvoices({
    String? status,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.mdInvoices, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getPoints({
    String period = '30d',
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.mdPoints, queryParameters: {
      'period': period,
      'skip': skip,
      'limit': limit,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getMonthlyPerformance({
    required int year,
    required int month,
  }) async {
    final r = await _api.get(ApiEndpoints.mdPerformanceMonthly,
        queryParameters: {'year': year, 'month': month});
    return Map<String, dynamic>.from(r.data);
  }
}
