import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/client.dart';
import 'package:perioxia_crm/data/repositories/client_repository.dart';

final clientsProvider =
    FutureProvider.autoDispose<List<Client>>((ref) async {
  final repo = ref.read(clientRepositoryProvider);
  return repo.getClients(limit: 50);
});

final clientDetailProvider =
    FutureProvider.autoDispose.family<Client, int>((ref, id) async {
  final repo = ref.read(clientRepositoryProvider);
  return repo.getClientById(id);
});
