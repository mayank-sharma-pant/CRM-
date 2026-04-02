import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

final _mgrInvoicesProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(managerRepositoryProvider).getTeamInvoices(limit: 200);
});

class ManagerOrdersScreen extends ConsumerWidget {
  const ManagerOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_mgrInvoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team orders',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load team invoices',
          onRetry: () => ref.invalidate(_mgrInvoicesProvider),
        ),
        data: (data) {
          final items =
              List<Map<String, dynamic>>.from(data['items'] ?? []);

          if (items.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No team invoices',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_mgrInvoicesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final inv = items[i];
                final id = inv['id'] as int?;
                final status = inv['status']?.toString() ?? '';
                final paid = status.toLowerCase() == 'paid';
                return GestureDetector(
                  onTap: () {
                    if (id != null) context.push('/invoices/$id');
                  },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: Theme.of(context)
                              .dividerColor
                              .withOpacity(0.12)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                inv['invoice_number']?.toString() ??
                                    'INV-$id',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14),
                              ),
                            ),
                            Text(
                              '₹${(inv['total'] as num?)?.toStringAsFixed(0) ?? '0'}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${inv['client'] ?? ''} · ${inv['sales_rep_name'] ?? ''}',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 6),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (paid
                                      ? AppColors.success
                                      : AppColors.warning)
                                  .withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: paid
                                    ? AppColors.success
                                    : AppColors.warning,
                              ),
                            ),
                          ),
                        ),
                      ],
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
