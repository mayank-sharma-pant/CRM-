import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';

List<Map<String, dynamic>> _mapList(dynamic raw) {
  if (raw is! List) return [];
  return raw
      .map((e) => Map<String, dynamic>.from(e as Map))
      .toList(growable: false);
}

class DashboardData {
  final int totalLeads;
  final int closedLeads;
  final int conversionRate;
  final double totalRevenue;
  final double paidRevenue;
  final double outstandingRevenue;
  final int lostLeads;
  final int activeLeads;
  final int stalledLeads;
  final double myRevenue;
  final int myOrders;
  final int taskCompleted;
  final int taskInProgress;
  final int taskOverdue;
  final int newLeadsThisWeek;
  final int tasksDoneThisWeek;
  final List<Map<String, dynamic>> priorityTasks;
  final List<Map<String, dynamic>> leadsByStatus;
  final List<Map<String, dynamic>> leadsBySource;

  const DashboardData({
    this.totalLeads = 0,
    this.closedLeads = 0,
    this.conversionRate = 0,
    this.totalRevenue = 0,
    this.paidRevenue = 0,
    this.outstandingRevenue = 0,
    this.lostLeads = 0,
    this.activeLeads = 0,
    this.stalledLeads = 0,
    this.myRevenue = 0,
    this.myOrders = 0,
    this.taskCompleted = 0,
    this.taskInProgress = 0,
    this.taskOverdue = 0,
    this.newLeadsThisWeek = 0,
    this.tasksDoneThisWeek = 0,
    this.priorityTasks = const [],
    this.leadsByStatus = const [],
    this.leadsBySource = const [],
  });
}

final dashboardProvider =
    FutureProvider.autoDispose<DashboardData>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.leadsDashboard);
  final data = response.data;
  final metrics = data['metrics'] ?? {};
  final taskMetrics = data['task_metrics'] ?? {};
  final activity = data['activity'] ?? {};

  return DashboardData(
    totalLeads: metrics['total_leads'] ?? 0,
    closedLeads: metrics['closed_leads'] ?? metrics['converted_leads'] ?? 0,
    conversionRate: metrics['conversion_rate'] ?? 0,
    totalRevenue: (metrics['total_revenue'] as num?)?.toDouble() ?? 0,
    paidRevenue: (metrics['paid_revenue'] as num?)?.toDouble() ?? 0,
    outstandingRevenue: (metrics['outstanding_revenue'] as num?)?.toDouble() ?? 0,
    lostLeads: metrics['lost_leads'] ?? 0,
    activeLeads: metrics['active_leads'] ?? 0,
    stalledLeads: metrics['stalled_leads'] ?? 0,
    myRevenue: (metrics['my_revenue'] as num?)?.toDouble() ?? 0,
    myOrders: metrics['my_orders'] ?? 0,
    taskCompleted: taskMetrics['completed'] ?? 0,
    taskInProgress: taskMetrics['in_progress'] ?? 0,
    taskOverdue: taskMetrics['overdue'] ?? 0,
    newLeadsThisWeek: activity['new_leads_this_week'] ?? 0,
    tasksDoneThisWeek: activity['tasks_done_this_week'] ?? 0,
    priorityTasks:
        List<Map<String, dynamic>>.from(data['priority_tasks'] ?? []),
    leadsByStatus: _mapList(
        data['leadsByStatus'] ?? data['leads_by_status']),
    leadsBySource: _mapList(
        data['leadsBySource'] ?? data['leads_by_source']),
  );
});
