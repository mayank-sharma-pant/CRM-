import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/lead.dart';

final leadRepositoryProvider = Provider<LeadRepository>((ref) {
  return LeadRepository(ref.read(apiClientProvider));
});

class LeadRepository {
  final ApiClient _api;

  LeadRepository(this._api);

  Future<List<Lead>> getLeads({int skip = 0, int limit = 20, String? status}) async {
    final response = await _api.get(ApiEndpoints.leads, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null) 'status': status,
    });
    final list = response.data['leads'] as List? ?? [];
    return list.map((e) => Lead.fromJson(e)).toList();
  }

  Future<Lead> getLeadById(int id) async {
    final response = await _api.get(ApiEndpoints.leadById(id));
    return Lead.fromJson(response.data);
  }

  Future<Lead> createLead(Map<String, dynamic> data) async {
    final response = await _api.post(ApiEndpoints.leads, data: data);
    return Lead.fromJson(response.data);
  }

  Future<Lead> updateLead(int id, Map<String, dynamic> data) async {
    final response = await _api.put(ApiEndpoints.leadById(id), data: data);
    return Lead.fromJson(response.data);
  }
}
