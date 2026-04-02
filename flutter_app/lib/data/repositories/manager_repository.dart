import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/constants/app_constants.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/storage/secure_storage.dart';

final managerRepositoryProvider = Provider<ManagerRepository>((ref) {
  return ManagerRepository(ref.read(apiClientProvider));
});

class ManagerRepository {
  final ApiClient _api;

  ManagerRepository(this._api);

  Future<Map<String, dynamic>> getDashboard() async {
    final r = await _api.get(ApiEndpoints.managerDashboard);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeam() async {
    final r = await _api.get(ApiEndpoints.managerTeam);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getMonitoring() async {
    final r = await _api.get(ApiEndpoints.managerMonitoring);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeamMemberPerformance(int userId) async {
    final r = await _api.get(ApiEndpoints.managerTeamPerformance(userId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeamLeads({
    String? status,
    int? memberId,
    int skip = 0,
    int limit = 200,
  }) async {
    final r = await _api.get(ApiEndpoints.managerLeads, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
      if (memberId != null) 'member_id': memberId,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<void> reassignLead(int leadId, int newAssigneeId) async {
    await _api.post(
      ApiEndpoints.managerLeadReassign(leadId),
      queryParameters: {'new_assignee_id': newAssigneeId},
    );
  }

  Future<Map<String, dynamic>> getTeamPerformanceReport(
      {String period = 'month'}) async {
    final r = await _api.get(ApiEndpoints.managerReportsPerformance,
        queryParameters: {'period': period});
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getTeamInvoices({
    String? status,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.managerInvoices, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<List<Map<String, dynamic>>> getCompanyTeams() async {
    final r = await _api.get(ApiEndpoints.managerTeams);
    final list = r.data['teams'] as List? ?? [];
    return List<Map<String, dynamic>>.from(list);
  }

  Future<void> createTransferRequest({
    required int userId,
    required int targetTeamId,
    String? reason,
  }) async {
    await _api.post(ApiEndpoints.managerTransferRequest, data: {
      'user_id': userId,
      'target_team_id': targetTeamId,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<void> removeTeamMember(int userId) async {
    final tid = await SecureStorage.read(AppConstants.activeTeamKey);
    final teamId = int.tryParse(tid ?? '');
    if (teamId == null) {
      throw StateError('Active team not set. Select a team in settings.');
    }
    await _api.delete(ApiEndpoints.managerRemoveMember(teamId, userId));
  }

  Future<void> createTeamTask({
    required String title,
    required int assigneeId,
    required String dueDateYyyyMmDd,
    String priority = 'medium',
  }) async {
    await _api.post(
      ApiEndpoints.managerTasks,
      queryParameters: {
        'title': title,
        'assignee_id': assigneeId,
        'due_date': dueDateYyyyMmDd,
        'priority': priority,
      },
    );
  }
}
