import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/task.dart';
import 'package:perioxia_crm/data/repositories/task_repository.dart';

final tasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  final repo = ref.read(taskRepositoryProvider);
  return repo.getTasks(limit: 50);
});
