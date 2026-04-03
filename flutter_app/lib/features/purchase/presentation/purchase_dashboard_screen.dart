import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Maps backend KPI id to invoice status filter on `/purchase-invoices`.
String? _kpiIdToStatusFilter(int? id) {
  switch (id) {
    case 1:
      return 'Pending';
    case 2:
      return 'Paid';
    case 3:
      return 'Overdue';
    case 4:
      return 'Draft';
    default:
      return null;
  }
}

class PurchaseDashboardScreen extends ConsumerWidget {
  const PurchaseDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(purchaseDashboardProvider);
    final monAsync = ref.watch(purchaseMonitoringProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: dashAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load purchase dashboard',
          onRetry: () => ref.invalidate(purchaseDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(purchaseDashboardProvider);
            ref.invalidate(purchaseMonitoringProvider);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: List<Map<String, dynamic>>.from(d['kpis'] ?? [])
                    .map((k) {
                  final id = k['id'] as int?;
                  final filter = _kpiIdToStatusFilter(id);
                  return SizedBox(
                    width: (MediaQuery.sizeOf(context).width - 42) / 2,
                    child: Material(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => context.push(
                          '/purchase-invoices',
                          extra: filter,
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: Theme.of(context)
                                    .dividerColor
                                    .withOpacity(0.12)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                k['label']?.toString() ?? '',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${k['value']}',
                                style: const TextStyle(
                                    fontSize: 20, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/purchase-sales'),
                      icon: const Icon(Icons.fact_check_outlined, size: 18),
                      label: const Text('Approvals'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/purchase-invoices'),
                      icon: const Icon(Icons.receipt_long_outlined, size: 18),
                      label: const Text('Invoices'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/purchase-monitoring'),
                  icon: const Icon(Icons.analytics_outlined, size: 18),
                  label: const Text('Monitoring'),
                ),
              ),
              Builder(
                builder: (context) {
                  final health = Map<String, dynamic>.from(
                      d['invoice_health'] ?? const {});
                  final paid = (health['paid'] as num?)?.toInt() ?? 0;
                  final pending = (health['pending'] as num?)?.toInt() ?? 0;
                  final overdue = (health['overdue'] as num?)?.toInt() ?? 0;
                  final draft = (health['draft'] as num?)?.toInt() ?? 0;
                  final total = paid + pending + overdue + draft;
                  if (total == 0) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 22),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Invoice health',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w700)),
                          TextButton(
                            onPressed: () => context.push('/purchase-invoices'),
                            child: const Text('Ledger'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _HealthBar(
                          label: 'Paid',
                          value: paid,
                          total: total,
                          color: AppColors.success),
                      const SizedBox(height: 8),
                      _HealthBar(
                          label: 'Pending',
                          value: pending,
                          total: total,
                          color: AppColors.warning),
                      const SizedBox(height: 8),
                      _HealthBar(
                          label: 'Overdue',
                          value: overdue,
                          total: total,
                          color: AppColors.error),
                      const SizedBox(height: 8),
                      _HealthBar(
                          label: 'Draft',
                          value: draft,
                          total: total,
                          color: AppColors.info),
                    ],
                  );
                },
              ),
              if ((d['approval_queue'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 22),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Approval queue',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700)),
                    TextButton(
                      onPressed: () => context.go('/purchase-sales'),
                      child: const Text('View all'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...List<Map<String, dynamic>>.from(d['approval_queue'] ?? [])
                    .map((q) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(q['client']?.toString() ?? ''),
                            subtitle: Text(
                                '${q['salesperson']} · ${q['date'] ?? ''}'),
                            trailing: Text(
                              '₹${(q['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            onTap: () {
                              final id = q['id'];
                              if (id is int) {
                                context.push('/purchase-sales/$id');
                              }
                            },
                          ),
                        )),
              ],
              monAsync.when(
                data: (mon) {
                  final alerts =
                      List<Map<String, dynamic>>.from(mon['alerts'] ?? []);
                  if (alerts.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 22),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Active indicators',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w700)),
                          TextButton(
                            onPressed: () =>
                                context.push('/purchase-monitoring'),
                            child: const Text('Live'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ...alerts.take(5).map((a) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              dense: true,
                              title: Text(a['title']?.toString() ?? ''),
                              subtitle: Text(
                                  a['message']?.toString() ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis),
                              trailing: Chip(
                                label: Text(
                                    a['severity']?.toString() ?? '',
                                    style: const TextStyle(fontSize: 10)),
                              ),
                            ),
                          )),
                    ],
                  );
                },
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HealthBar extends StatelessWidget {
  final String label;
  final int value;
  final int total;
  final Color color;

  const _HealthBar({
    required this.label,
    required this.value,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final pct = total > 0 ? (value / total).clamp(0.0, 1.0) : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted)),
            Text('$value',
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 6,
            backgroundColor: color.withOpacity(0.15),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}
