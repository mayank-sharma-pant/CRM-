import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/follow_up.dart';

final followUpRepositoryProvider = Provider<FollowUpRepository>((ref) {
  return FollowUpRepository(ref.read(apiClientProvider));
});

class FollowUpRepository {
  final ApiClient _api;

  FollowUpRepository(this._api);

  Future<List<FollowUp>> getAll() async {
    final response = await _api.get(ApiEndpoints.followUps);
    final list = response.data is List
        ? response.data as List
        : (response.data['items'] ?? response.data['follow_ups'] ?? []) as List;
    return list.map((e) => FollowUp.fromJson(e)).toList();
  }

  Future<List<FollowUp>> getToday() async {
    final response = await _api.get(ApiEndpoints.followUpsToday);
    final list = response.data is List ? response.data as List : (response.data['items'] ?? []) as List;
    return list.map((e) => FollowUp.fromJson(e)).toList();
  }

  Future<List<FollowUp>> getOverdue() async {
    final response = await _api.get(ApiEndpoints.followUpsOverdue);
    final list = response.data is List ? response.data as List : (response.data['items'] ?? []) as List;
    return list.map((e) => FollowUp.fromJson(e)).toList();
  }

  Future<FollowUp> create(Map<String, dynamic> data) async {
    final response = await _api.post(ApiEndpoints.followUps, data: data);
    return FollowUp.fromJson(response.data);
  }

  Future<void> complete(int id, String outcome) async {
    await _api.post(ApiEndpoints.followUpComplete(id), data: {'outcome': outcome});
  }

  Future<void> reschedule(int id, Map<String, dynamic> data) async {
    await _api.post(ApiEndpoints.followUpReschedule(id), data: data);
  }

  Future<void> delete(int id) async {
    await _api.delete(ApiEndpoints.followUpById(id));
  }
}
