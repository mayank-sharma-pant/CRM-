import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/dashboard/providers/dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _currFmt = NumberFormat.compactCurrency(symbol: '₹', decimalDigits: 0);

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (user != null)
              Text(
                'Welcome, ${user.fullName}',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load dashboard',
          onRetry: () => ref.invalidate(dashboardProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // KPI grid (parity with web sales dashboard)
              Row(
                children: [
                  Expanded(
                      child: _KpiCard(
                          label: 'Total Leads',
                          subLabel: 'active pipeline',
                          value: '${data.totalLeads}',
                          icon: Icons.people_outline,
                          color: AppColors.primary)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _KpiCard(
                          label: 'Closed Leads',
                          subLabel: 'converted',
                          value: '${data.closedLeads}',
                          icon: Icons.check_circle_outline,
                          color: AppColors.success)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                      child: _KpiCard(
                          label: 'Conversion Rate',
                          subLabel: 'win velocity',
                          value: '${data.conversionRate}%',
                          icon: Icons.percent,
                          color: AppColors.accent)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _KpiCard(
                          label: 'My Revenue',
                          subLabel: 'total invoiced',
                          value: data.totalRevenue >= 1000
                              ? '₹${(data.totalRevenue / 1000).toStringAsFixed(1)}k'
                              : _currFmt.format(data.totalRevenue),
                          icon: Icons.trending_up,
                          color: AppColors.accent)),
                ],
              ),
              const SizedBox(height: 12),

              // Revenue card
              if (data.totalRevenue > 0)
                _RevenueCard(data: data),
              if (data.totalRevenue > 0) const SizedBox(height: 16),

              // Quick actions
              Row(
                children: [
                  _QuickActionChip(
                    icon: Icons.person_add_outlined,
                    label: 'New Lead',
                    onTap: () => context.push('/leads'),
                  ),
                  const SizedBox(width: 10),
                  _QuickActionChip(
                    icon: Icons.add_task,
                    label: 'New Task',
                    onTap: () => context.push('/tasks'),
                  ),
                  const SizedBox(width: 10),
                  _QuickActionChip(
                    icon: Icons.auto_awesome_outlined,
                    label: 'AI Chat',
                    onTap: () => context.push('/assistant'),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Priority tasks
              if (data.priorityTasks.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Priority Tasks',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700)),
                    GestureDetector(
                      onTap: () => context.push('/tasks'),
                      child: Text('View all',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...data.priorityTasks.take(5).map(
                    (t) => _PriorityTaskCard(
                        task: t,
                        onTap: () => context.push('/tasks'),
                      )),
                const SizedBox(height: 16),
              ],

              // Leads by status
              if (data.leadsByStatus.isNotEmpty) ...[
                const Text('Leads by Status',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                _LeadsStatusGrid(items: data.leadsByStatus),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String? subLabel;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiCard({
    required this.label,
    this.subLabel,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(
                  fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary)),
          if (subLabel != null) ...[
            const SizedBox(height: 2),
            Text(subLabel!,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }
}

class _RevenueCard extends StatelessWidget {
  final DashboardData data;
  const _RevenueCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final paidPct =
        data.totalRevenue > 0 ? (data.paidRevenue / data.totalRevenue) : 0.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Revenue',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              Text(_currFmt.format(data.totalRevenue),
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 8,
              child: LinearProgressIndicator(
                value: paidPct.clamp(0.0, 1.0),
                backgroundColor: AppColors.warning.withOpacity(0.2),
                valueColor:
                    const AlwaysStoppedAnimation<Color>(AppColors.success),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _RevenueLine(
                  color: AppColors.success,
                  label: 'Paid',
                  value: _currFmt.format(data.paidRevenue)),
              _RevenueLine(
                  color: AppColors.warning,
                  label: 'Outstanding',
                  value: _currFmt.format(data.outstandingRevenue)),
            ],
          ),
        ],
      ),
    );
  }
}

class _RevenueLine extends StatelessWidget {
  final Color color;
  final String label;
  final String value;

  const _RevenueLine(
      {required this.color, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text('$label: ',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        Text(value,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color)),
      ],
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: Theme.of(context).dividerColor.withOpacity(0.15)),
          ),
          child: Column(
            children: [
              Icon(icon, size: 22, color: AppColors.primary),
              const SizedBox(height: 6),
              Text(label,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PriorityTaskCard extends StatelessWidget {
  final Map<String, dynamic> task;
  final VoidCallback onTap;
  const _PriorityTaskCard({required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isOverdue = task['statusReason'] == 'OVERDUE';
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isOverdue
              ? AppColors.error.withOpacity(0.3)
              : AppColors.warning.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isOverdue ? Icons.warning_amber_rounded : Icons.schedule,
            size: 18,
            color: isOverdue ? AppColors.error : AppColors.warning,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task['title'] ?? '',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  isOverdue ? 'Overdue' : 'Due today',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isOverdue ? AppColors.error : AppColors.warning,
                  ),
                ),
              ],
            ),
          ),
          if (task['dueDate'] != null)
            Text(task['dueDate'],
                style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
          const SizedBox(width: 4),
          Icon(Icons.chevron_right,
              size: 18, color: AppColors.textMuted.withOpacity(0.6)),
        ],
      ),
        ),
      ),
    );
  }
}

class _LeadsStatusGrid extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  const _LeadsStatusGrid({required this.items});

  static const _statusColors = {
    'New': AppColors.info,
    'Contacted': AppColors.primary,
    'Active': AppColors.accent,
    'Qualified': AppColors.accent,
    'Proposal': AppColors.warning,
    'Converted': AppColors.success,
    'Lost': AppColors.error,
  };

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items.map((item) {
        final status = item['status']?.toString() ?? 'Unknown';
        final count = item['count'] ?? 0;
        final color = _statusColors[status] ?? AppColors.textMuted;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration:
                    BoxDecoration(shape: BoxShape.circle, color: color),
              ),
              const SizedBox(width: 8),
              Text('$status: ',
                  style: TextStyle(fontSize: 12, color: color)),
              Text('$count',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: color)),
            ],
          ),
        );
      }).toList(),
    );
  }
}
