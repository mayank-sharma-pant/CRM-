import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';

final companyAdminRepositoryProvider = Provider<CompanyAdminRepository>((ref) {
  return CompanyAdminRepository(ref.read(apiClientProvider));
});

class CompanyAdminRepository {
  final ApiClient _api;

  CompanyAdminRepository(this._api);

  Future<Map<String, dynamic>> getDashboardStats() async {
    final r = await _api.get(ApiEndpoints.adminDashboardStats);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listUsers({
    String? status,
    String? role,
    String? search,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.adminUsers, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
      if (role != null && role.isNotEmpty) 'role': role,
      if (search != null && search.isNotEmpty) 'search': search,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getUser(int userId) async {
    final r = await _api.get(ApiEndpoints.adminUser(userId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> updateUser(int userId, Map<String, dynamic> body) async {
    await _api.put(ApiEndpoints.adminUser(userId), data: body);
  }

  Future<void> activateUser(int userId) async {
    await _api.post(ApiEndpoints.adminUserActivate(userId));
  }

  Future<void> disableUser(int userId) async {
    await _api.post(ApiEndpoints.adminUserDisable(userId));
  }

  Future<void> deleteUser(int userId) async {
    await _api.delete(ApiEndpoints.adminUserDelete(userId));
  }

  Future<Map<String, dynamic>> listTeams({int skip = 0, int limit = 100}) async {
    final r = await _api.get(ApiEndpoints.adminTeams, queryParameters: {
      'skip': skip,
      'limit': limit,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeam(int teamId) async {
    final r = await _api.get(ApiEndpoints.adminTeam(teamId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> createTeam(String name) async {
    final r = await _api.post(ApiEndpoints.adminTeams, data: {'name': name});
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> updateTeam(int teamId, {String? name}) async {
    await _api.put(ApiEndpoints.adminTeam(teamId),
        data: {if (name != null) 'name': name});
  }

  Future<void> deleteTeam(int teamId) async {
    await _api.delete(ApiEndpoints.adminTeam(teamId));
  }

  Future<void> addTeamMember(int teamId, int userId) async {
    await _api.post(ApiEndpoints.adminTeamMembers(teamId), data: {
      'user_id': userId,
    });
  }

  Future<void> removeTeamMember(int teamId, int userId) async {
    await _api.delete(ApiEndpoints.adminTeamMember(teamId, userId));
  }

  Future<Map<String, dynamic>> getApprovals({int skip = 0, int limit = 100}) async {
    final r = await _api.get(ApiEndpoints.adminApprovals, queryParameters: {
      'skip': skip,
      'limit': limit,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> approveUserSignup(int userId) async {
    await _api.post(ApiEndpoints.adminApprove(userId));
  }

  Future<void> rejectUserSignup(int userId, {String? reason}) async {
    await _api.post(ApiEndpoints.adminReject(userId), data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<Map<String, dynamic>> getHierarchy() async {
    final r = await _api.get(ApiEndpoints.adminHierarchy);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getAuditLog({
    int days = 7,
    int skip = 0,
    int limit = 50,
  }) async {
    final r = await _api.get(ApiEndpoints.adminAuditLog, queryParameters: {
      'days': days,
      'skip': skip,
      'limit': limit,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTransferRequests({String? status}) async {
    final r = await _api.get(ApiEndpoints.adminTransferRequests,
        queryParameters: {if (status != null && status.isNotEmpty) 'status': status});
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> approveTransfer(int requestId, {String? comment}) async {
    await _api.post(ApiEndpoints.adminTransferApprove(requestId), data: {
      'status': 'approved',
      if (comment != null && comment.isNotEmpty) 'admin_comment': comment,
    });
  }

  Future<void> rejectTransfer(int requestId, {String? comment}) async {
    await _api.post(ApiEndpoints.adminTransferReject(requestId), data: {
      'status': 'rejected',
      if (comment != null && comment.isNotEmpty) 'admin_comment': comment,
    });
  }
}
