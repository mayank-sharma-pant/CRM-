import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/dashboard/providers/dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Parity with web `/sales/reports`: KPI row, growth placeholder, pie + bar charts from `GET /leads/dashboard`.
class SalesReportsScreen extends ConsumerStatefulWidget {
  const SalesReportsScreen({super.key});

  @override
  ConsumerState<SalesReportsScreen> createState() =>
      _SalesReportsScreenState();
}

class _SalesReportsScreenState extends ConsumerState<SalesReportsScreen> {
  String _period = 'month'; // UI parity; sales has no overview time-series API.

  Color _statusColor(String? status) {
    switch (status) {
      case 'New':
        return AppColors.info;
      case 'Contacted':
        return AppColors.primary;
      case 'Active':
      case 'Qualified':
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

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load report data',
          onRetry: () => ref.invalidate(dashboardProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Data-driven insights',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'week', label: Text('Week')),
                      ButtonSegment(value: 'month', label: Text('Month')),
                    ],
                    selected: {_period},
                    onSelectionChanged: (s) =>
                        setState(() => _period = s.first),
                    style: ButtonStyle(
                      visualDensity: VisualDensity.compact,
                      padding: WidgetStateProperty.all(
                        const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Overview metrics (web reports grid)
              _MetricGrid(data: data),
              const SizedBox(height: 20),

              // Growth — web uses optional overview API; sales has none.
              _GrowthCard(period: _period),
              const SizedBox(height: 20),

              // Pipeline + sources
              LayoutBuilder(
                builder: (context, c) {
                  final wide = c.maxWidth >= 720;
                  if (wide) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _ChartCard(
                            title: 'Pipeline distribution',
                            child: _StatusPie(
                              items: data.leadsByStatus,
                              colorFor: _statusColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _ChartCard(
                            title: 'Top sources',
                            child: _SourceBarChart(items: data.leadsBySource),
                          ),
                        ),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      _ChartCard(
                        title: 'Pipeline distribution',
                        child: _StatusPie(
                          items: data.leadsByStatus,
                          colorFor: _statusColor,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _ChartCard(
                        title: 'Top sources',
                        child: _SourceBarChart(items: data.leadsBySource),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  final DashboardData data;
  const _MetricGrid({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
                child: _MetricTile(
                    label: 'Total Leads', value: '${data.totalLeads}')),
            const SizedBox(width: 10),
            Expanded(
                child: _MetricTile(
                    label: 'Converted',
                    value: '${data.closedLeads}',
                    valueColor: AppColors.success)),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
                child: _MetricTile(
                    label: 'Lost',
                    value: '${data.lostLeads}',
                    valueColor: AppColors.error)),
            const SizedBox(width: 10),
            Expanded(
                child: _MetricTile(
                    label: 'Conversion rate',
                    value: '${data.conversionRate}%',
                    valueColor: AppColors.accent)),
          ],
        ),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _MetricTile({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: valueColor ?? Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _GrowthCard extends StatelessWidget {
  final String period;
  const _GrowthCard({required this.period});

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
          const Text(
            'Growth trajectory',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Lead volume vs. conversions over time (${period == 'week' ? 'week' : 'month'} view).',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.show_chart,
                      size: 40, color: AppColors.textMuted.withOpacity(0.5)),
                  const SizedBox(height: 10),
                  Text(
                    'No time-series overview in this build.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'The web app loads this chart only when an overview endpoint is configured. Sales reports use pipeline charts below.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _ChartCard({required this.title, required this.child});

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
          Text(title,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _StatusPie extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final Color Function(String?) colorFor;

  const _StatusPie({
    required this.items,
    required this.colorFor,
  });

  @override
  Widget build(BuildContext context) {
    final sections = <PieChartSectionData>[];
    for (var i = 0; i < items.length; i++) {
      final m = items[i];
      final status = m['status']?.toString();
      final count = (m['count'] as num?)?.toDouble() ?? 0;
      if (count <= 0) continue;
      final color = colorFor(status);
      sections.add(
        PieChartSectionData(
          color: color,
          value: count,
          showTitle: false,
          radius: 52,
        ),
      );
    }

    if (sections.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No pipeline data')),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 200,
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 44,
              sections: sections,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 10,
          runSpacing: 6,
          children: [
            for (var i = 0; i < items.length; i++)
              if (((items[i]['count'] as num?)?.toDouble() ?? 0) > 0)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: colorFor(items[i]['status']?.toString()),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${items[i]['status']}: ${items[i]['count']}',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
          ],
        ),
      ],
    );
  }
}

class _SourceBarChart extends StatelessWidget {
  final List<Map<String, dynamic>> items;

  const _SourceBarChart({required this.items});

  @override
  Widget build(BuildContext context) {
    final filtered = items
        .where((m) => ((m['count'] as num?)?.toInt() ?? 0) > 0)
        .toList();
    if (filtered.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No source breakdown')),
      );
    }

    final maxY = filtered.fold<double>(
          0,
          (a, m) => a > ((m['count'] as num?)?.toDouble() ?? 0)
              ? a
              : ((m['count'] as num?)?.toDouble() ?? 0),
        ) *
        1.15;

    return SizedBox(
      height: 240,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxY <= 0 ? 1 : maxY,
          barGroups: List.generate(filtered.length, (i) {
            final c = (filtered[i]['count'] as num?)?.toDouble() ?? 0;
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: c,
                  width: 14,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(4),
                  ),
                  color: AppColors.primary.withOpacity(0.9),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: maxY <= 0 ? 1 : maxY,
                    color: Theme.of(context).dividerColor.withOpacity(0.12),
                  ),
                ),
              ],
            );
          }),
          titlesData: FlTitlesData(
            show: true,
            topTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 28,
                getTitlesWidget: (v, m) => Text(
                  v.toInt().toString(),
                  style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 36,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i < 0 || i >= filtered.length) {
                    return const SizedBox();
                  }
                  final label =
                      filtered[i]['source']?.toString() ?? '—';
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      label.length > 10 ? '${label.substring(0, 9)}…' : label,
                      style: TextStyle(fontSize: 9, color: AppColors.textMuted),
                    ),
                  );
                },
              ),
            ),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxY > 5 ? maxY / 4 : 1,
            getDrawingHorizontalLine: (v) => FlLine(
              color: Theme.of(context).dividerColor.withOpacity(0.2),
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(show: false),
        ),
      ),
    );
  }
}
