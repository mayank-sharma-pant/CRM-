import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseMonitoringScreen extends ConsumerWidget {
  const PurchaseMonitoringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseMonitoringProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase monitoring',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          TextButton(
            onPressed: () => context.push('/purchase-invoices'),
            child: const Text('Invoices'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load monitoring',
          onRetry: () => ref.invalidate(purchaseMonitoringProvider),
        ),
        data: (d) {
          final m = Map<String, dynamic>.from(d['metrics'] ?? {});
          final summary = Map<String, dynamic>.from(d['summary'] ?? {});
          final trendDir =
              (summary['trendDirection'] ?? 'stable').toString();
          final riskTrend =
              List<Map<String, dynamic>>.from(d['risk_trend'] ?? []);

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(purchaseMonitoringProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Trend: $trendDir',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _Metric('Pending', '${m['pending_invoices'] ?? '—'}'),
                    _Metric('Overdue', '${m['overdue_invoices'] ?? '—'}'),
                    _Metric(
                        'Overdue ₹',
                        '₹${(m['overdue_amount'] as num?)?.toStringAsFixed(0) ?? '0'}'),
                    _Metric(
                        'Pending ₹',
                        '₹${(m['pending_amount'] as num?)?.toStringAsFixed(0) ?? '0'}'),
                    _Metric(
                        'Paid ₹',
                        '₹${(m['paid_amount'] as num?)?.toStringAsFixed(0) ?? '0'}'),
                    _Metric(
                        'Settlement',
                        '${m['settlement_rate'] ?? '—'}%'),
                    _Metric('Total', '${m['total_invoices'] ?? '—'}'),
                  ],
                ),
                if (riskTrend.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('Activity (7d)',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: riskTrend.map((pt) {
                        final label = pt['date']?.toString() ?? '';
                        final v = (pt['value'] as num?)?.toInt() ?? 0;
                        final maxV = riskTrend
                            .map((e) => (e['value'] as num?)?.toInt() ?? 0)
                            .fold<int>(0, (a, b) => a > b ? a : b);
                        final h = maxV > 0 ? (v / maxV * 80).clamp(4.0, 80.0) : 4.0;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text('$v',
                                    style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Container(
                                  height: h,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.35),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(label,
                                    style: const TextStyle(
                                        fontSize: 9,
                                        color: AppColors.textMuted)),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const Text('Alerts',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...List<Map<String, dynamic>>.from(d['alerts'] ?? []).map(
                  (a) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(a['title']?.toString() ?? ''),
                      subtitle: Text(a['message']?.toString() ?? ''),
                      isThreeLine: true,
                      trailing: Chip(
                        label: Text(a['severity']?.toString() ?? '',
                            style: const TextStyle(fontSize: 10)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;

  const _Metric(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: (MediaQuery.sizeOf(context).width - 44) / 2,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          Text(value,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
