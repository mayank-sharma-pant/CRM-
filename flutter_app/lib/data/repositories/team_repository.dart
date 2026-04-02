import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/team.dart';

final teamRepositoryProvider = Provider<TeamRepository>((ref) {
  return TeamRepository(ref.read(apiClientProvider));
});

class TeamRepository {
  final ApiClient _api;

  TeamRepository(this._api);

  Future<List<Team>> getTeams() async {
    final response = await _api.get(ApiEndpoints.teams);
    final list = response.data['teams'] as List? ?? [];
    return list.map((e) => Team.fromJson(e)).toList();
  }
}
