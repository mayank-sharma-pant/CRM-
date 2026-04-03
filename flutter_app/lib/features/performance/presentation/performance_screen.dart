import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/dashboard/providers/dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Parity with web `PerformanceView` + `/sales/performance` (only `GET /leads/dashboard` data).
final _inrWhole = NumberFormat('#,##0', 'en_IN');

class PerformanceScreen extends ConsumerWidget {
  const PerformanceScreen({super.key});

  static const double _twoColBreakpoint = 900;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Performance',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: dashAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load performance data',
          onRetry: () => ref.invalidate(dashboardProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final wideMetrics = constraints.maxWidth >= 600;
              final wideTwoCol = constraints.maxWidth >= _twoColBreakpoint;

              final metricsBlock = wideMetrics
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _TopMetricCard(
                            label: 'Total Leads',
                            value: '${data.totalLeads}',
                            icon: Icons.people_outline,
                            accent: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _TopMetricCard(
                            label: 'Conversion Rate',
                            value: '${data.conversionRate}%',
                            icon: Icons.track_changes_outlined,
                            accent: AppColors.success,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _TopMetricCard(
                            label: 'Revenue Sourced',
                            value: '₹${_inrWhole.format(data.myRevenue)}',
                            icon: Icons.trending_up,
                            accent: AppColors.primary,
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _TopMetricCard(
                          label: 'Total Leads',
                          value: '${data.totalLeads}',
                          icon: Icons.people_outline,
                          accent: AppColors.primary,
                          fullWidth: true,
                        ),
                        const SizedBox(height: 12),
                        _TopMetricCard(
                          label: 'Conversion Rate',
                          value: '${data.conversionRate}%',
                          icon: Icons.track_changes_outlined,
                          accent: AppColors.success,
                          fullWidth: true,
                        ),
                        const SizedBox(height: 12),
                        _TopMetricCard(
                          label: 'Revenue Sourced',
                          value: '₹${_inrWhole.format(data.myRevenue)}',
                          icon: Icons.trending_up,
                          accent: AppColors.primary,
                          fullWidth: true,
                        ),
                      ],
                    );

              final taskCard = _SectionCard(
                title: 'Task Execution',
                icon: Icons.check_circle_outline,
                child: Column(
                  children: [
                    _TaskRow(
                      label: 'Completed',
                      value: data.taskCompleted,
                      dotColor: AppColors.success,
                    ),
                    const SizedBox(height: 10),
                    _TaskRow(
                      label: 'In Progress',
                      value: data.taskInProgress,
                      dotColor: AppColors.primary,
                    ),
                    const SizedBox(height: 10),
                    _TaskRow(
                      label: 'Overdue',
                      value: data.taskOverdue,
                      dotColor: AppColors.error,
                      emphasizeValue: true,
                    ),
                  ],
                ),
              );

              final activityCard = _SectionCard(
                title: 'Recent Activity',
                icon: Icons.calendar_today_outlined,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ActivitySubsection(
                      heading: 'This Week',
                      children: [
                        _ActivityRow(
                            label: 'New Leads',
                            value: '${data.newLeadsThisWeek}'),
                        _ActivityRow(
                            label: 'Tasks Done',
                            value: '${data.tasksDoneThisWeek}'),
                        _ActivityRow(
                            label: 'Orders Made', value: '${data.myOrders}'),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _ActivitySubsection(
                      heading: 'Pipeline Health',
                      children: [
                        _ActivityRow(
                          label: 'Stalled Leads (14d+)',
                          value: '${data.stalledLeads}',
                        ),
                      ],
                    ),
                  ],
                ),
              );

              final taskActivityRow = wideTwoCol
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: taskCard),
                        const SizedBox(width: 16),
                        Expanded(child: activityCard),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        taskCard,
                        const SizedBox(height: 16),
                        activityCard,
                      ],
                    );

              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    'Real-time sales execution metrics',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  metricsBlock,
                  const SizedBox(height: 20),
                  taskActivityRow,
                  const SizedBox(height: 24),
                  Divider(
                      height: 1,
                      color: Theme.of(context).dividerColor.withOpacity(0.2)),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      'Snapshot as of ${DateFormat.yMMMd().format(DateTime.now())}',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textMuted),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _TopMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color accent;
  final bool fullWidth;

  const _TopMetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(16),
      constraints: const BoxConstraints(minHeight: 120),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: AppColors.textSecondary,
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: accent,
                  ),
                ),
              ),
              Icon(icon, size: 22, color: accent.withOpacity(0.35)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
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
            children: [
              Icon(icon, size: 18, color: AppColors.textMuted),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  final String label;
  final int value;
  final Color dotColor;
  final bool emphasizeValue;

  const _TaskRow({
    required this.label,
    required this.value,
    required this.dotColor,
    this.emphasizeValue = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHighest
            .withOpacity(0.35),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(shape: BoxShape.circle, color: dotColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w500)),
          ),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: emphasizeValue ? AppColors.error : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// Left border + padding like web `pl-4 border-l-2`.
class _ActivitySubsection extends StatelessWidget {
  final String heading;
  final List<Widget> children;

  const _ActivitySubsection({
    required this.heading,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          heading.toUpperCase(),
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.6,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.only(left: 14),
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: Theme.of(context).dividerColor.withOpacity(0.35),
                width: 2,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  final String label;
  final String value;

  const _ActivityRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          Text(value,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
