import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _invoiceDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, int>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.invoiceById(id));
  return Map<String, dynamic>.from(response.data);
});

class InvoiceDetailScreen extends ConsumerWidget {
  final int invoiceId;
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoiceAsync = ref.watch(_invoiceDetailProvider(invoiceId));

    return Scaffold(
      appBar: AppBar(title: const Text('Invoice Details')),
      body: invoiceAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load invoice',
          onRetry: () =>
              ref.invalidate(_invoiceDetailProvider(invoiceId)),
        ),
        data: (inv) {
          final status = inv['status']?.toString() ?? 'draft';
          final isPaid = status.toLowerCase() == 'paid';
          final items =
              List<Map<String, dynamic>>.from(inv['items'] ?? []);
          final total = (inv['total'] as num?)?.toDouble() ?? 0;
          final clientName =
              inv['client_name'] ?? inv['client']?['name'] ?? '—';
          final issuedRaw = inv['issued_date'] ?? inv['issued'];
          final issuedDate = issuedRaw != null
              ? DateFormat('MMM d, yyyy')
                  .format(DateTime.parse(issuedRaw.toString()))
              : null;
          final taxRows = gstTaxRows(inv);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          inv['invoice_number'] ??
                              'INV-${inv['id'] ?? ''}',
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(clientName.toString(),
                          style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: (isPaid ? AppColors.success : AppColors.warning)
                          .withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color:
                            isPaid ? AppColors.success : AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
              if (issuedDate != null) ...[
                const SizedBox(height: 8),
                Text('Issued: $issuedDate',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textMuted)),
              ],
              const SizedBox(height: 24),

              // Items table
              const Text('Items',
                  style: TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: Theme.of(context)
                          .dividerColor
                          .withOpacity(0.12)),
                ),
                child: Column(
                  children: [
                    // Header row
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Expanded(
                              flex: 3,
                              child: Text('Item',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary))),
                          Expanded(
                              child: Text('Qty',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary))),
                          Expanded(
                              child: Text('Price',
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary))),
                          Expanded(
                              child: Text('Total',
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary))),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    ...items.map((item) {
                      final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                      final price =
                          (item['unit_price'] as num?)?.toDouble() ??
                              (item['price'] as num?)?.toDouble() ??
                              0;
                      final lineTotal = qty * price;
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        child: Row(
                          children: [
                            Expanded(
                                flex: 3,
                                child: Text(
                                    item['description'] ??
                                        item['name'] ??
                                        item['product_name'] ??
                                        '—',
                                    style: const TextStyle(fontSize: 13))),
                            Expanded(
                                child: Text('$qty',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 13))),
                            Expanded(
                                child: Text('₹${price.toStringAsFixed(0)}',
                                    textAlign: TextAlign.right,
                                    style: const TextStyle(fontSize: 13))),
                            Expanded(
                                child: Text(
                                    '₹${lineTotal.toStringAsFixed(0)}',
                                    textAlign: TextAlign.right,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600))),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 1),
                    ...taxRows.map((row) => Padding(
                          padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(row.key,
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary)),
                              Text('₹${row.value.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                        )),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('Total: ',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary)),
                          Text('₹${total.toStringAsFixed(0)}',
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
