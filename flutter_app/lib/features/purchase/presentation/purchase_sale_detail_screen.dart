import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/purchase_repository.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseSaleDetailScreen extends ConsumerWidget {
  final int saleId;

  const PurchaseSaleDetailScreen({super.key, required this.saleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseSaleDetailProvider(saleId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review invoice',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load',
          onRetry: () =>
              ref.invalidate(purchaseSaleDetailProvider(saleId)),
        ),
        data: (d) {
          final client =
              Map<String, dynamic>.from(d['client'] ?? {});
          final deal = Map<String, dynamic>.from(d['deal'] ?? {});
          final sp = Map<String, dynamic>.from(d['salesperson'] ?? {});
          final items = List<Map<String, dynamic>>.from(deal['items'] ?? []);
          final status = d['status']?.toString() ?? '';

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(d['number']?.toString() ?? 'Invoice',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              Text(status, style: TextStyle(color: AppColors.textSecondary)),
              const Divider(height: 24),
              Text(client['name']?.toString() ?? 'Client',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (client['email'] != null)
                Text(client['email'].toString(),
                    style: const TextStyle(fontSize: 13)),
              const SizedBox(height: 12),
              Text('Sales: ${sp['name'] ?? '—'}',
                  style: const TextStyle(fontSize: 13)),
              const Divider(height: 24),
              const Text('Line items',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...items.map((it) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(it['description']?.toString() ?? ''),
                    subtitle: Text('Qty ${it['quantity']}'),
                    trailing: Text(
                        '₹${(it['total'] as num?)?.toStringAsFixed(2) ?? '0'}'),
                  )),
              const Divider(),
              if (deal['subtotal'] != null)
                _Row('Subtotal', '₹${deal['subtotal']}'),
              if (deal['tax'] != null) _Row('Tax', '₹${deal['tax']}'),
              _Row('Total', '₹${deal['amount']}',
                  strong: true),
              const SizedBox(height: 24),
              if (status.toLowerCase().contains('draft') ||
                  status.toLowerCase() == 'pending')
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: () async {
                          await ref
                              .read(purchaseRepositoryProvider)
                              .approveSale(saleId);
                          ref.invalidate(purchaseSaleDetailProvider(saleId));
                          ref.invalidate(purchaseSalesProvider);
                          ref.invalidate(purchaseDashboardProvider);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Approved')));
                            context.pop();
                          }
                        },
                        child: const Text('Approve'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final reason = await showDialog<String>(
                            context: context,
                            builder: (ctx) {
                              final c = TextEditingController();
                              return AlertDialog(
                                title: const Text('Reject reason'),
                                content: TextField(
                                  controller: c,
                                  decoration: const InputDecoration(
                                      hintText: 'Required'),
                                ),
                                actions: [
                                  TextButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, null),
                                      child: const Text('Cancel')),
                                  FilledButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, c.text.trim()),
                                      child: const Text('Reject')),
                                ],
                              );
                            },
                          );
                          if (reason == null || reason.isEmpty) return;
                          await ref
                              .read(purchaseRepositoryProvider)
                              .rejectSale(saleId, reason);
                          ref.invalidate(purchaseSaleDetailProvider(saleId));
                          ref.invalidate(purchaseSalesProvider);
                          ref.invalidate(purchaseDashboardProvider);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Rejected')));
                            context.pop();
                          }
                        },
                        child: const Text('Reject'),
                      ),
                    ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String k;
  final String v;
  final bool strong;

  const _Row(this.k, this.v, {this.strong = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(color: AppColors.textMuted)),
          Text(v,
              style: TextStyle(
                  fontWeight:
                      strong ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}
