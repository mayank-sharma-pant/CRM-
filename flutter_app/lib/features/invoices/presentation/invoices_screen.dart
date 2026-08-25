import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

final _invoicesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.invoices);
  return invoiceItemsFromResponse(response.data);
});

class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoicesAsync = ref.watch(_invoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: invoicesAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load invoices',
          onRetry: () => ref.invalidate(_invoicesProvider),
        ),
        data: (invoices) {
          if (invoices.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No invoices yet',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_invoicesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: invoices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final inv = invoices[i];
                final status = inv['status']?.toString() ?? 'draft';
                final isPaid = status.toLowerCase() == 'paid';
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: Theme.of(context)
                            .dividerColor
                            .withOpacity(0.12)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isPaid
                            ? Icons.check_circle
                            : Icons.receipt_long_outlined,
                        color: isPaid ? AppColors.success : AppColors.warning,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                                inv['invoice_number'] ??
                                    'INV-${inv['id'] ?? i}',
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600)),
                            if (inv['client_name'] != null)
                              Text(inv['client_name'],
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (inv['total'] != null)
                            Text(
                                '₹${(inv['total'] as num).toStringAsFixed(0)}',
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700)),
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (isPaid
                                      ? AppColors.success
                                      : AppColors.warning)
                                  .withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: isPaid
                                    ? AppColors.success
                                    : AppColors.warning,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
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
