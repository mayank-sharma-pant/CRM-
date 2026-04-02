import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/repositories/md_repository.dart';

final mdDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getDashboard();
});

final mdRevenueProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getRevenue();
});

final mdSalesProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getSales();
});

final mdMonitoringProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getMonitoring();
});

final mdTeamsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getTeams();
});

final mdInvoicesListProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String?>(
        (ref, status) async {
  return ref.read(mdRepositoryProvider).getInvoices(status: status);
});

final mdEmployeeLookupProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, search) async {
  return ref.read(mdRepositoryProvider).employeeLookup(
        search: search.isEmpty ? null : search,
      );
});

final mdEmployeeDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, int>((ref, userId) async {
  return ref.read(mdRepositoryProvider).getEmployeeDetail(userId);
});

final mdClientsDataProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getClients(limit: 200);
});

final mdLeadsDataProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getLeads(limit: 200);
});
