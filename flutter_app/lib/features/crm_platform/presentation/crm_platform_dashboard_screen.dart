import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/platform_token_banner.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformDashboardScreen extends ConsumerWidget {
  const CrmPlatformDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformMetricsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Perioxia platform',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const PlatformTokenMissingBanner(),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message:
                    'Could not load platform metrics. Check password login and operator access.',
                onRetry: () => ref.invalidate(crmPlatformMetricsProvider),
              ),
              data: (d) {
                final companies =
                    Map<String, dynamic>.from(d['companies'] ?? {});
                final users = Map<String, dynamic>.from(d['users'] ?? {});
                final biz =
                    Map<String, dynamic>.from(d['business_metrics'] ?? {});
                final planDist = _parsePlanDistribution(d['plan_distribution']);

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(crmPlatformMetricsProvider);
                    ref.invalidate(platformTokenPresentProvider);
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text('Tenants',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _MetricRow(companies),
                      const SizedBox(height: 20),
                      const Text('Plans (tenants by tier)',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      if (planDist.isEmpty)
                        Text(
                          'No plan data yet',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textMuted),
                        )
                      else
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: planDist
                              .map((e) => _Chip(e.label, '${e.count}'))
                              .toList(),
                        ),
                      const SizedBox(height: 20),
                      const Text('Users (tenant accounts)',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _TwoCol(
                        'Total',
                        '${users['total'] ?? '—'}',
                        label2: 'Active',
                        value2: '${users['active'] ?? '—'}',
                      ),
                      const SizedBox(height: 20),
                      const Text('Business volume (all tenants)',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _TwoCol(
                        'Leads',
                        '${biz['leads'] ?? '—'}',
                        label2: 'Clients',
                        value2: '${biz['clients'] ?? '—'}',
                      ),
                      const SizedBox(height: 8),
                      _TwoCol(
                        'Tasks',
                        '${biz['tasks'] ?? '—'}',
                        label2: 'Invoices',
                        value2: '${biz['invoices'] ?? '—'}',
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: () => context.go('/platform-pending'),
                        icon:
                            const Icon(Icons.how_to_reg_outlined, size: 20),
                        label: const Text('Review pending companies'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Backend: `[{ "plan_id": 1|2|3, "count": n }, ...]` from `/api/platform/metrics/dashboard`.
List<_PlanDistEntry> _parsePlanDistribution(dynamic raw) {
  if (raw is! List) return [];
  final out = <_PlanDistEntry>[];
  for (final item in raw) {
    if (item is! Map) continue;
    final m = Map<String, dynamic>.from(item);
    final id = m['plan_id'];
    final c = m['count'];
    final planId = id is int ? id : int.tryParse(id?.toString() ?? '');
    final count = c is int ? c : int.tryParse(c?.toString() ?? '') ?? 0;
    if (planId == null) continue;
    out.add(_PlanDistEntry(planId: planId, count: count));
  }
  out.sort((a, b) => a.planId.compareTo(b.planId));
  return out;
}

String _planTierLabel(int planId) {
  switch (planId) {
    case 1:
      return 'Starter';
    case 2:
      return 'Growth';
    case 3:
      return 'Enterprise';
    default:
      return 'Plan $planId';
  }
}

class _PlanDistEntry {
  final int planId;
  final int count;

  _PlanDistEntry({required this.planId, required this.count});

  String get label => _planTierLabel(planId);
}

class _MetricRow extends StatelessWidget {
  final Map<String, dynamic> m;

  const _MetricRow(this.m);

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _Chip('Total', '${m['total'] ?? '—'}'),
        _Chip('Active', '${m['active'] ?? '—'}'),
        _Chip('Pending', '${m['pending'] ?? '—'}'),
        _Chip('Suspended', '${m['suspended'] ?? '—'}'),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final String value;

  const _Chip(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
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

class _TwoCol extends StatelessWidget {
  final String label1;
  final String value1;
  final String label2;
  final String value2;

  const _TwoCol(
    this.label1,
    this.value1, {
    required this.label2,
    required this.value2,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _Chip(label1, value1)),
        const SizedBox(width: 10),
        Expanded(child: _Chip(label2, value2)),
      ],
    );
  }
}
