import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/dashboard/providers/dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _currFmt = NumberFormat.compactCurrency(symbol: '₹', decimalDigits: 0);

class PerformanceScreen extends ConsumerWidget {
  const PerformanceScreen({super.key});

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
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Leads Metrics',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricCard(
                    label: 'Total Leads',
                    value: '${data.totalLeads}',
                    icon: Icons.people_outline,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 12),
                  _MetricCard(
                    label: 'Closed Deals',
                    value: '${data.closedLeads}',
                    icon: Icons.handshake_outlined,
                    color: AppColors.success,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricCard(
                    label: 'Conversion Rate',
                    value: '${data.conversionRate}%',
                    icon: Icons.trending_up,
                    color: AppColors.accent,
                  ),
                  const SizedBox(width: 12),
                  _MetricCard(
                    label: 'Active Tasks',
                    value: '${data.activeTasks}',
                    icon: Icons.task_alt,
                    color: AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Revenue
              const Text('Revenue',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _RevenueSection(data: data),
              const SizedBox(height: 24),

              // Pipeline health
              if (data.leadsByStatus.isNotEmpty) ...[
                const Text('Pipeline Health',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                _PipelineBar(items: data.leadsByStatus, total: data.totalLeads),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 6,
                  children: data.leadsByStatus.map((item) {
                    final status = item['status']?.toString() ?? '';
                    final count = item['count'] ?? 0;
                    return _LegendItem(
                        status: status,
                        count: count,
                        color: _statusColor(status));
                  }).toList(),
                ),
              ],
              const SizedBox(height: 24),

              // Footer
              Center(
                child: Text(
                  'Data as of ${DateFormat('MMM d, yyyy – h:mm a').format(DateTime.now())}',
                  style: TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Color _statusColor(String status) {
    switch (status) {
      case 'New':
        return AppColors.info;
      case 'Contacted':
        return AppColors.primary;
      case 'Qualified':
      case 'Active':
        return AppColors.accent;
      case 'Proposal':
        return AppColors.warning;
      case 'Converted':
        return AppColors.success;
      case 'Lost':
        return AppColors.error;
      default:
        return AppColors.textMuted;
    }
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
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
                Icon(icon, size: 18, color: color),
                const Spacer(),
                Container(
                  width: 8,
                  height: 8,
                  decoration:
                      BoxDecoration(shape: BoxShape.circle, color: color),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(value,
                style: TextStyle(
                    fontSize: 26, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _RevenueSection extends StatelessWidget {
  final DashboardData data;
  const _RevenueSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final paidPct =
        data.totalRevenue > 0 ? data.paidRevenue / data.totalRevenue : 0.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.15)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Revenue',
                  style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600)),
              Text(_currFmt.format(data.totalRevenue),
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: SizedBox(
              height: 12,
              child: LinearProgressIndicator(
                value: paidPct.clamp(0.0, 1.0),
                backgroundColor: AppColors.warning.withOpacity(0.2),
                valueColor:
                    const AlwaysStoppedAnimation<Color>(AppColors.success),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _RevChip(
                  color: AppColors.success,
                  label: 'Paid',
                  value: _currFmt.format(data.paidRevenue)),
              _RevChip(
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

class _RevChip extends StatelessWidget {
  final Color color;
  final String label;
  final String value;

  const _RevChip(
      {required this.color, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text('$label: ',
            style:
                TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        Text(value,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }
}

class _PipelineBar extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final int total;
  const _PipelineBar({required this.items, required this.total});

  @override
  Widget build(BuildContext context) {
    if (total == 0) return const SizedBox.shrink();
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        height: 14,
        child: Row(
          children: items.map((item) {
            final count = (item['count'] as num?)?.toInt() ?? 0;
            final pct = count / total;
            final status = item['status']?.toString() ?? '';
            return Expanded(
              flex: (pct * 100).round().clamp(1, 100),
              child: Container(color: PerformanceScreen._statusColor(status)),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final String status;
  final int count;
  final Color color;

  const _LegendItem(
      {required this.status, required this.count, required this.color});

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
        const SizedBox(width: 4),
        Text('$status ($count)',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}
