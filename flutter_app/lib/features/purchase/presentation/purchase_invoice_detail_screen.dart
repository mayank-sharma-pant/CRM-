import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/purchase_repository.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseInvoiceDetailScreen extends ConsumerWidget {
  final int invoiceId;

  const PurchaseInvoiceDetailScreen({super.key, required this.invoiceId});

  String _status(dynamic s) => s?.toString().toLowerCase() ?? '';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseInvoiceDetailProvider(invoiceId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load invoice',
          onRetry: () =>
              ref.invalidate(purchaseInvoiceDetailProvider(invoiceId)),
        ),
        data: (d) {
          final st = _status(d['status']);
          final client = Map<String, dynamic>.from(d['client'] ?? {});
          final items = List<Map<String, dynamic>>.from(d['items'] ?? []);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(d['number']?.toString() ?? '',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              Text(d['status']?.toString() ?? '',
                  style: TextStyle(color: AppColors.textSecondary)),
              const Divider(height: 24),
              Text(client['name']?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (client['email'] != null)
                Text(client['email'].toString(),
                    style: const TextStyle(fontSize: 13)),
              const Divider(height: 20),
              ...items.map((it) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(it['description']?.toString() ?? ''),
                    subtitle: Text('Qty ${it['quantity']} @ ${it['unit_price']}'),
                    trailing: Text(
                        '₹${(it['total'] as num?)?.toStringAsFixed(2) ?? '0'}'),
                  )),
              const Divider(),
              _Row('Subtotal', '₹${d['subtotal']}'),
              _Row('Tax', '₹${d['tax']}'),
              _Row('Total', '₹${d['total']}',
                  strong: true),
              if (d['issued'] != null)
                _Row('Issued', d['issued'].toString()),
              if (d['due'] != null) _Row('Due', d['due'].toString()),
              const SizedBox(height: 20),
              if (st == 'draft') ...[
                FilledButton.icon(
                  onPressed: () async {
                    await ref
                        .read(purchaseRepositoryProvider)
                        .sendInvoice(invoiceId);
                    ref.invalidate(purchaseInvoiceDetailProvider(invoiceId));
                    ref.invalidate(purchaseInvoicesProvider(null));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Marked as sent')));
                    }
                  },
                  icon: const Icon(Icons.send_outlined, size: 20),
                  label: const Text('Send to client'),
                ),
              ],
              if (st == 'pending' || st == 'overdue') ...[
                FilledButton.icon(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2100),
                    );
                    if (date == null || !context.mounted) return;
                    final y = date.year.toString().padLeft(4, '0');
                    final m = date.month.toString().padLeft(2, '0');
                    final day = date.day.toString().padLeft(2, '0');
                    await ref.read(purchaseRepositoryProvider).markInvoicePaid(
                          invoiceId,
                          paymentDateYyyyMmDd: '$y-$m-$day',
                        );
                    ref.invalidate(purchaseInvoiceDetailProvider(invoiceId));
                    ref.invalidate(purchaseInvoicesProvider(null));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Marked paid')));
                    }
                  },
                  icon: const Icon(Icons.paid_outlined, size: 20),
                  label: const Text('Mark paid'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    await ref
                        .read(purchaseRepositoryProvider)
                        .sendPaymentReminder(invoiceId);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reminder queued')));
                    }
                  },
                  icon: const Icon(Icons.notifications_active_outlined, size: 20),
                  label: const Text('Send reminder'),
                ),
              ],
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
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}
