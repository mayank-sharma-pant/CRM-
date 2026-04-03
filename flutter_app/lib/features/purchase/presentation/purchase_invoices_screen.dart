import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseInvoicesScreen extends ConsumerStatefulWidget {
  const PurchaseInvoicesScreen({super.key});

  @override
  ConsumerState<PurchaseInvoicesScreen> createState() =>
      _PurchaseInvoicesScreenState();
}

class _PurchaseInvoicesScreenState extends ConsumerState<PurchaseInvoicesScreen> {
  String? _statusFilter; // null = all

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(purchaseInvoicesProvider(_statusFilter));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                _Chip(
                  label: 'All',
                  selected: _statusFilter == null,
                  onTap: () => setState(() => _statusFilter = null),
                ),
                _Chip(
                  label: 'Paid',
                  selected: _statusFilter == 'Paid',
                  onTap: () => setState(() => _statusFilter = 'Paid'),
                ),
                _Chip(
                  label: 'Pending',
                  selected: _statusFilter == 'Pending',
                  onTap: () => setState(() => _statusFilter = 'Pending'),
                ),
                _Chip(
                  label: 'Overdue',
                  selected: _statusFilter == 'Overdue',
                  onTap: () => setState(() => _statusFilter = 'Overdue'),
                ),
                _Chip(
                  label: 'Draft',
                  selected: _statusFilter == 'Draft',
                  onTap: () => setState(() => _statusFilter = 'Draft'),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load invoices',
                onRetry: () =>
                    ref.invalidate(purchaseInvoicesProvider(_statusFilter)),
              ),
              data: (d) {
                final summary =
                    Map<String, dynamic>.from(d['summary'] ?? {});
                final list =
                    List<Map<String, dynamic>>.from(d['invoices'] ?? []);
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(
                      purchaseInvoicesProvider(_statusFilter)),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (summary.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Outstanding: ₹${(summary['total_outstanding'] as num?)?.toStringAsFixed(0) ?? '0'} · Paid ${summary['paid'] ?? 0} · Pending ${summary['pending'] ?? 0}',
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ...list.map((inv) {
                        final id = inv['id'] as int;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(inv['number']?.toString() ?? '—'),
                            subtitle: Text(
                                '${inv['client']} · ${inv['sales_rep_name']}'),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '₹${(inv['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  inv['status']?.toString() ?? '',
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ],
                            ),
                            onTap: () =>
                                context.push('/purchase-invoice/$id'),
                          ),
                        );
                      }),
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

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}
