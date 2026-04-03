import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseSalesListScreen extends ConsumerWidget {
  const PurchaseSalesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseSalesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales approvals',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load queue',
          onRetry: () => ref.invalidate(purchaseSalesProvider),
        ),
        data: (d) {
          final sales = List<Map<String, dynamic>>.from(d['sales'] ?? []);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(purchaseSalesProvider),
            child: sales.isEmpty
                ? const Center(
                    child: Text('No draft or pending invoices',
                        style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: sales.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final s = sales[i];
                      final id = s['id'] as int;
                      return Material(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => context.push('/purchase-sales/$id'),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(s['client']?.toString() ?? '—',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700)),
                                      Text(
                                        '${s['salesperson']} · ${s['date'] ?? ''}',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '₹${(s['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800),
                                    ),
                                    Text(
                                      s['status']?.toString() ?? '',
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          );
        },
      ),
    );
  }
}
