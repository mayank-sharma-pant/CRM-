import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/client.dart';

final clientRepositoryProvider = Provider<ClientRepository>((ref) {
  return ClientRepository(ref.read(apiClientProvider));
});

class ClientRepository {
  final ApiClient _api;

  ClientRepository(this._api);

  Future<List<Client>> getClients({int skip = 0, int limit = 20}) async {
    final response = await _api.get(ApiEndpoints.clients, queryParameters: {
      'skip': skip,
      'limit': limit,
    });
    final list = response.data['clients'] as List? ?? [];
    return list.map((e) => Client.fromJson(e)).toList();
  }

  Future<Client> getClientById(int id) async {
    final response = await _api.get(ApiEndpoints.clientById(id));
    return Client.fromJson(response.data);
  }
}
