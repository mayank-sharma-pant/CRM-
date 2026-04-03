import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_create_invoice_sheet.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class PurchaseInvoicesScreen extends ConsumerStatefulWidget {
  /// Optional filter from navigation `extra` (e.g. KPI tap from dashboard).
  final String? initialStatusFilter;

  const PurchaseInvoicesScreen({super.key, this.initialStatusFilter});

  @override
  ConsumerState<PurchaseInvoicesScreen> createState() =>
      _PurchaseInvoicesScreenState();
}

class _PurchaseInvoicesScreenState extends ConsumerState<PurchaseInvoicesScreen> {
  String? _statusFilter;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.initialStatusFilter;
  }

  @override
  void didUpdateWidget(covariant PurchaseInvoicesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialStatusFilter != oldWidget.initialStatusFilter) {
      _statusFilter = widget.initialStatusFilter;
    }
  }

  List<Map<String, dynamic>> _applySearch(
      List<Map<String, dynamic>> list) {
    if (_search.isEmpty) return list;
    final q = _search.toLowerCase();
    return list.where((inv) {
      final client = inv['client']?.toString().toLowerCase() ?? '';
      final num = inv['number']?.toString().toLowerCase() ?? '';
      final rep = inv['sales_rep_name']?.toString().toLowerCase() ?? '';
      return client.contains(q) || num.contains(q) || rep.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(purchaseInvoicesProvider(_statusFilter));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showPurchaseCreateInvoiceSheet(context, ref),
        icon: const Icon(Icons.note_add_outlined),
        label: const Text('New'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: InputDecoration(
                hintText: 'Search client, invoice #, rep…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Row(
              children: [
                _Chip(
                  label: 'All',
                  selected: _statusFilter == null,
                  onTap: () => setState(() => _statusFilter = null),
                ),
                _Chip(
                  label: 'Draft',
                  selected: _statusFilter == 'Draft',
                  onTap: () => setState(() => _statusFilter = 'Draft'),
                ),
                _Chip(
                  label: 'Pending',
                  selected: _statusFilter == 'Pending',
                  onTap: () => setState(() => _statusFilter = 'Pending'),
                ),
                _Chip(
                  label: 'Paid',
                  selected: _statusFilter == 'Paid',
                  onTap: () => setState(() => _statusFilter = 'Paid'),
                ),
                _Chip(
                  label: 'Overdue',
                  selected: _statusFilter == 'Overdue',
                  onTap: () => setState(() => _statusFilter = 'Overdue'),
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
                final raw =
                    List<Map<String, dynamic>>.from(d['invoices'] ?? []);
                final list = _applySearch(raw);

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(
                      purchaseInvoicesProvider(_statusFilter)),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 88),
                    children: [
                      if (summary.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        _KpiRow(summary: summary, totalCount: raw.length),
                        const SizedBox(height: 12),
                      ],
                      if (list.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 48),
                          child: Center(
                            child: Text(
                              raw.isEmpty
                                  ? 'No invoices'
                                  : 'No matching records',
                              style: const TextStyle(color: AppColors.textMuted),
                            ),
                          ),
                        )
                      else
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

class _KpiRow extends StatelessWidget {
  final Map<String, dynamic> summary;
  final int totalCount;

  const _KpiRow({required this.summary, required this.totalCount});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _KpiMini(
            label: 'Volume',
            value: '$totalCount',
            sub: 'items',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _KpiMini(
            label: 'Paid',
            value: '${summary['paid'] ?? 0}',
            sub: 'settled',
            color: AppColors.success,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _KpiMini(
            label: 'Pending',
            value: '${summary['pending'] ?? 0}',
            sub: 'open',
            color: AppColors.warning,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _KpiMini(
            label: 'Overdue',
            value: '${summary['overdue'] ?? 0}',
            sub: 'risk',
            color: AppColors.error,
          ),
        ),
      ],
    );
  }
}

class _KpiMini extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color? color;

  const _KpiMini({
    required this.label,
    required this.value,
    required this.sub,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: color ?? Theme.of(context).colorScheme.onSurface,
            ),
          ),
          Text(sub,
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
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
