import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseDashboardScreen extends ConsumerWidget {
  const PurchaseDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseDashboardProvider);

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
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load purchase dashboard',
          onRetry: () => ref.invalidate(purchaseDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(purchaseDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: List<Map<String, dynamic>>.from(d['kpis'] ?? [])
                    .map((k) {
                  return SizedBox(
                    width: (MediaQuery.sizeOf(context).width - 42) / 2,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
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
              if ((d['approval_queue'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 22),
                const Text('Approval queue',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
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
            ],
          ),
        ),
      ),
    );
  }
}
