import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdRevenueScreen extends ConsumerWidget {
  const MdRevenueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mdRevenueProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Revenue',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          TextButton(
            onPressed: () => context.push('/md-invoices'),
            child: const Text('Invoices'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load revenue',
          onRetry: () => ref.invalidate(mdRevenueProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(mdRevenueProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: List<Map<String, dynamic>>.from(d['kpis'] ?? [])
                    .map((k) => Expanded(
                          child: _KpiTile(
                            label: k['label']?.toString() ?? '',
                            value: k['value']?.toString() ?? '',
                            change: k['change']?.toString(),
                          ),
                        ))
                    .toList(),
              ),
              if (d['trendInsight'] != null) ...[
                const SizedBox(height: 16),
                Text(d['trendInsight'].toString(),
                    style: TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
              ],
              const SizedBox(height: 20),
              const Text('Recent weekly summary',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ...List<Map<String, dynamic>>.from(d['summaryTable'] ?? [])
                  .map((row) => ListTile(
                        dense: true,
                        title: Text(row['period']?.toString() ?? ''),
                        subtitle: Text(row['revenue']?.toString() ?? ''),
                        trailing: Text(row['delta']?.toString() ?? '',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.success)),
                      )),
              if ((d['risks'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 16),
                const Text('Risk signals (overdue)',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...List<Map<String, dynamic>>.from(d['risks'] ?? [])
                    .map((r) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(r['signal']?.toString() ?? ''),
                            subtitle: Text(
                                '${r['metric']} · ${r['delta']} · ${r['detected']}'),
                            trailing: Chip(
                              label: Text(r['severity']?.toString() ?? '',
                                  style: const TextStyle(fontSize: 10)),
                            ),
                          ),
                        )),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final String? change;

  const _KpiTile({
    required this.label,
    required this.value,
    this.change,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.all(12),
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
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          Text(value,
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          if (change != null)
            Text(change!,
                style: const TextStyle(fontSize: 11, color: AppColors.success)),
        ],
      ),
    );
  }
}
