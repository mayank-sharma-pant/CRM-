import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/whatsapp_thread.dart';

final whatsAppRepositoryProvider = Provider<WhatsAppRepository>((ref) {
  return WhatsAppRepository(ref.read(apiClientProvider));
});

class WhatsAppRepository {
  final ApiClient _api;

  WhatsAppRepository(this._api);

  Future<List<WhatsAppThread>> threads({bool unanswered = false}) async {
    final response = await _api.get(ApiEndpoints.whatsappThreads, queryParameters: {
      'limit': 50,
      if (unanswered) 'unanswered': true,
    });
    final raw = response.data;
    final list = raw is Map ? (raw['items'] as List? ?? []) : <dynamic>[];
    return list
        .whereType<Map>()
        .map((e) => WhatsAppThread.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<({List<WhatsAppChatMessage> items, bool sessionOpen})> messages({
    int? leadId,
    int? clientId,
  }) async {
    final response = await _api.get(ApiEndpoints.whatsappMessages, queryParameters: {
      if (leadId != null) 'lead_id': leadId,
      if (clientId != null) 'client_id': clientId,
    });
    final raw = response.data;
    final map = raw is Map ? raw : <String, dynamic>{};
    final list = map['items'] as List? ?? [];
    final items = list
        .whereType<Map>()
        .map((e) => WhatsAppChatMessage.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return (items: items, sessionOpen: map['session_open'] == true);
  }

  Future<void> sendSession({
    required String body,
    int? leadId,
    int? clientId,
  }) async {
    await _api.post(ApiEndpoints.whatsappSessionSend, data: {
      'body': body,
      if (leadId != null) 'lead_id': leadId,
      if (clientId != null) 'client_id': clientId,
    });
  }
}
