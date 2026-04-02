import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';

class ManagerDashboardVm {
  final int totalTeamLeads;
  final int closedDeals;
  final int teamConversionRate;
  final double totalRevenue;
  final double paidRevenue;
  final double outstandingRevenue;
  final List<Map<String, dynamic>> teamMembers;
  final List<Map<String, dynamic>> priorityTasks;

  const ManagerDashboardVm({
    required this.totalTeamLeads,
    required this.closedDeals,
    required this.teamConversionRate,
    required this.totalRevenue,
    required this.paidRevenue,
    required this.outstandingRevenue,
    required this.teamMembers,
    required this.priorityTasks,
  });
}

final managerDashboardProvider =
    FutureProvider.autoDispose<ManagerDashboardVm>((ref) async {
  final mgr = ref.read(managerRepositoryProvider);
  final api = ref.read(apiClientProvider);

  final dash = await mgr.getDashboard();
  final metrics = dash['metrics'] ?? {};
  final teamMembers = List<Map<String, dynamic>>.from(dash['team_members'] ?? []);
  final priorityTasks =
      List<Map<String, dynamic>>.from(dash['priority_tasks'] ?? []);

  double totalRev = 0, paidRev = 0;
  try {
    final inv = await api.get(ApiEndpoints.invoices, queryParameters: {
      'limit': 500,
    });
    final raw = inv.data;
    final items = raw is List
        ? raw
        : List<dynamic>.from(raw['items'] ?? raw['invoices'] ?? []);
    for (final i in items) {
      if (i is! Map) continue;
      final m = Map<String, dynamic>.from(i);
      final t = (m['total'] as num?)?.toDouble() ?? 0;
      totalRev += t;
      if ((m['status']?.toString() ?? '') == 'Paid') paidRev += t;
    }
  } catch (_) {}

  return ManagerDashboardVm(
    totalTeamLeads: metrics['total_team_leads'] ?? 0,
    closedDeals: metrics['closed_deals'] ?? 0,
    teamConversionRate: metrics['team_conversion_rate'] ?? 0,
    totalRevenue: totalRev,
    paidRevenue: paidRev,
    outstandingRevenue: totalRev - paidRev,
    teamMembers: teamMembers,
    priorityTasks: priorityTasks,
  );
});
