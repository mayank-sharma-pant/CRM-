import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';

class DashboardData {
  final int totalLeads;
  final int closedLeads;
  final int conversionRate;
  final double totalRevenue;
  final double paidRevenue;
  final double outstandingRevenue;
  final int activeTasks;
  final List<Map<String, dynamic>> priorityTasks;
  final List<Map<String, dynamic>> leadsByStatus;

  const DashboardData({
    this.totalLeads = 0,
    this.closedLeads = 0,
    this.conversionRate = 0,
    this.totalRevenue = 0,
    this.paidRevenue = 0,
    this.outstandingRevenue = 0,
    this.activeTasks = 0,
    this.priorityTasks = const [],
    this.leadsByStatus = const [],
  });
}

final dashboardProvider =
    FutureProvider.autoDispose<DashboardData>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.leadsDashboard);
  final data = response.data;
  final metrics = data['metrics'] ?? {};

  return DashboardData(
    totalLeads: metrics['total_leads'] ?? 0,
    closedLeads: metrics['closed_leads'] ?? metrics['converted_leads'] ?? 0,
    conversionRate: metrics['conversion_rate'] ?? 0,
    totalRevenue: (metrics['total_revenue'] as num?)?.toDouble() ?? 0,
    paidRevenue: (metrics['paid_revenue'] as num?)?.toDouble() ?? 0,
    outstandingRevenue: (metrics['outstanding_revenue'] as num?)?.toDouble() ?? 0,
    activeTasks: metrics['active_tasks'] ?? 0,
    priorityTasks:
        List<Map<String, dynamic>>.from(data['priority_tasks'] ?? []),
    leadsByStatus:
        List<Map<String, dynamic>>.from(data['leads_by_status'] ?? []),
  );
});
