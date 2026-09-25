import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/meeting_item.dart';

final meetingRepositoryProvider = Provider<MeetingRepository>((ref) {
  return MeetingRepository(ref.read(apiClientProvider));
});

class MeetingRepository {
  final ApiClient _api;

  MeetingRepository(this._api);

  Future<List<MeetingItem>> list({String? bucket}) async {
    final response = await _api.get(ApiEndpoints.meetings, queryParameters: {
      'limit': 100,
      if (bucket != null && bucket.isNotEmpty) 'bucket': bucket,
    });
    final raw = response.data;
    final list = raw is Map ? (raw['items'] as List? ?? []) : <dynamic>[];
    return list
        .whereType<Map>()
        .map((e) => MeetingItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<MeetingItem> create({
    required String subject,
    required String startsAt,
    int? leadId,
  }) async {
    final response = await _api.post(ApiEndpoints.meetings, data: {
      'subject': subject,
      'starts_at': startsAt,
      if (leadId != null) 'lead_id': leadId,
    });
    return MeetingItem.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<void> setStatus(int id, String status) async {
    await _api.patch(ApiEndpoints.meetingById(id), data: {'status': status});
  }
}
