import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/manager/providers/manager_dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _currFmt = NumberFormat.compactCurrency(symbol: '₹', decimalDigits: 0);

class ManagerDashboardScreen extends ConsumerWidget {
  const ManagerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(managerDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team Dashboard',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load team dashboard',
          onRetry: () => ref.invalidate(managerDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(managerDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                      child: _Kpi(
                          label: 'Team Leads',
                          value: '${d.totalTeamLeads}',
                          icon: Icons.groups_outlined,
                          color: AppColors.primary)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _Kpi(
                          label: 'Closed',
                          value: '${d.closedDeals}',
                          icon: Icons.check_circle_outline,
                          color: AppColors.success)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _Kpi(
                          label: 'Conv. Rate',
                          value: '${d.teamConversionRate}%',
                          icon: Icons.percent,
                          color: AppColors.accent)),
                ],
              ),
              if (d.totalRevenue > 0) ...[
                const SizedBox(height: 14),
                _RevenueStrip(d: d),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  _QuickChip(
                      label: 'Team',
                      icon: Icons.groups_2_outlined,
                      onTap: () => context.go('/team')),
                  const SizedBox(width: 8),
                  _QuickChip(
                      label: 'Reports',
                      icon: Icons.pie_chart_outline,
                      onTap: () => context.push('/reports')),
                  const SizedBox(width: 8),
                  _QuickChip(
                      label: 'Team orders',
                      icon: Icons.receipt_long_outlined,
                      onTap: () => context.push('/manager-orders')),
                ],
              ),
              if (d.teamMembers.isNotEmpty) ...[
                const SizedBox(height: 22),
                const Text('Sales performance',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...d.teamMembers.map((m) => _MemberTile(
                      name: m['name']?.toString() ?? '',
                      active: m['leads_active'] ?? 0,
                      converted: m['leads_converted'] ?? 0,
                      onTap: () {
                        final id = m['id'];
                        if (id != null) context.push('/team/$id');
                      },
                    )),
              ],
              if (d.priorityTasks.isNotEmpty) ...[
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Priority tasks (overdue)',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700)),
                    TextButton(
                      onPressed: () => context.go('/tasks'),
                      child: const Text('View all'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...d.priorityTasks.map((t) => _TaskRow(task: t)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _Kpi({
    required this.label,
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
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          Text(label,
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _RevenueStrip extends StatelessWidget {
  final ManagerDashboardVm d;
  const _RevenueStrip({required this.d});

  @override
  Widget build(BuildContext context) {
    final pct =
        d.totalRevenue > 0 ? (d.paidRevenue / d.totalRevenue) : 0.0;
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
              const Text('Invoice revenue (your scope)',
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600)),
              Text(_currFmt.format(d.totalRevenue),
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: AppColors.warning.withOpacity(0.2),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.success),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Paid: ${_currFmt.format(d.paidRevenue)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.success)),
              Text('Outstanding: ${_currFmt.format(d.outstandingRevenue)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.warning)),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _QuickChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: Theme.of(context).dividerColor.withOpacity(0.12)),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(height: 4),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 10, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  final String name;
  final int active;
  final int converted;
  final VoidCallback onTap;

  const _MemberTile({
    required this.name,
    required this.active,
    required this.converted,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: Theme.of(context).dividerColor.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withOpacity(0.12),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14)),
            ),
            Text('A:$active',
                style: TextStyle(fontSize: 11, color: AppColors.info)),
            const SizedBox(width: 8),
            Text('C:$converted',
                style: TextStyle(fontSize: 11, color: AppColors.success)),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  final Map<String, dynamic> task;
  const _TaskRow({required this.task});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.error.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber, color: AppColors.error, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(task['title']?.toString() ?? '',
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600)),
          ),
          Text(task['dueDate']?.toString() ?? '',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}
