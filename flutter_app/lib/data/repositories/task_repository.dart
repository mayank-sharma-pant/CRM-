import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/task.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.read(apiClientProvider));
});

class TaskRepository {
  final ApiClient _api;

  TaskRepository(this._api);

  Future<List<Task>> getTasks({int skip = 0, int limit = 100, String? status}) async {
    final response = await _api.get(ApiEndpoints.tasksList, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null) 'status': status,
    });
    final list = response.data['tasks'] as List? ?? [];
    return list.map((e) => Task.fromJson(e)).toList();
  }

  Future<Task> createTask(Map<String, dynamic> data) async {
    final response = await _api.post(ApiEndpoints.tasks, data: data);
    return Task.fromJson(response.data);
  }

  Future<Task> updateTask(int id, Map<String, dynamic> data) async {
    final response = await _api.put(ApiEndpoints.taskById(id), data: data);
    return Task.fromJson(response.data);
  }

  Future<void> completeTask(int id) async {
    await _api.post(ApiEndpoints.completeTask(id));
  }

  Future<void> deleteTask(int id) async {
    await _api.delete(ApiEndpoints.taskById(id));
  }
}
