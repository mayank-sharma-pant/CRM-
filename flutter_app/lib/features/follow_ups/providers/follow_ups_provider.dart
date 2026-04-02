import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/follow_up.dart';
import 'package:perioxia_crm/data/repositories/follow_up_repository.dart';

enum FollowUpFilter { all, today, overdue }

final followUpFilterProvider = StateProvider<FollowUpFilter>((ref) => FollowUpFilter.all);

final followUpsProvider =
    FutureProvider.autoDispose<List<FollowUp>>((ref) async {
  final repo = ref.read(followUpRepositoryProvider);
  final filter = ref.watch(followUpFilterProvider);
  switch (filter) {
    case FollowUpFilter.today:
      return repo.getToday();
    case FollowUpFilter.overdue:
      return repo.getOverdue();
    case FollowUpFilter.all:
      return repo.getAll();
  }
});
