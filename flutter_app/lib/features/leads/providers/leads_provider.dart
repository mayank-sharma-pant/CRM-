import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/lead.dart';
import 'package:perioxia_crm/data/repositories/lead_repository.dart';

final leadsProvider =
    FutureProvider.autoDispose.family<List<Lead>, String?>((ref, status) async {
  final repo = ref.read(leadRepositoryProvider);
  return repo.getLeads(limit: 50, status: status);
});

final leadDetailProvider =
    FutureProvider.autoDispose.family<Lead, int>((ref, id) async {
  final repo = ref.read(leadRepositoryProvider);
  return repo.getLeadById(id);
});
