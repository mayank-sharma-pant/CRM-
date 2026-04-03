import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Maps backend invoice status to the same UI buckets as web `purchase/sales`.
String _uiBucket(Map<String, dynamic> sale) {
  final raw = (sale['status'] ?? '').toString().toLowerCase();
  if (['pending', 'paid', 'sent', 'overdue'].contains(raw)) {
    return 'Approved';
  }
  if (['cancelled', 'rejected'].contains(raw)) {
    return 'Rejected';
  }
  if (raw == 'draft') {
    return 'Pending Review';
  }
  return 'Pending Review';
}

class PurchaseSalesListScreen extends ConsumerStatefulWidget {
  const PurchaseSalesListScreen({super.key});

  @override
  ConsumerState<PurchaseSalesListScreen> createState() =>
      _PurchaseSalesListScreenState();
}

class _PurchaseSalesListScreenState extends ConsumerState<PurchaseSalesListScreen> {
  String _filter = 'All';
  String _search = '';

  static const _filters = ['All', 'Pending Review', 'Approved', 'Rejected'];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(purchaseSalesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales approvals',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search client or amount…',
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
              children: _filters.map((f) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f == 'Pending Review' ? 'Pending' : f),
                    selected: _filter == f,
                    onSelected: (_) => setState(() => _filter = f),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load queue',
                onRetry: () => ref.invalidate(purchaseSalesProvider),
              ),
              data: (d) {
                var sales =
                    List<Map<String, dynamic>>.from(d['sales'] ?? []);

                if (_search.isNotEmpty) {
                  sales = sales.where((s) {
                    final client =
                        (s['client'] ?? '').toString().toLowerCase();
                    final amt =
                        (s['amount'] ?? '').toString().toLowerCase();
                    return client.contains(_search) || amt.contains(_search);
                  }).toList();
                }

                if (_filter != 'All') {
                  sales = sales
                      .where((s) => _uiBucket(s) == _filter)
                      .toList();
                }

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(purchaseSalesProvider),
                  child: sales.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            Center(
                              child: Text(
                                'No draft or pending invoices',
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: sales.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final s = sales[i];
                            final id = s['id'] as int;
                            final bucket = _uiBucket(s);
                            return Material(
                              color:
                                  Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: () =>
                                    context.push('/purchase-sales/$id'),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              s['client']?.toString() ?? '—',
                                              style: const TextStyle(
                                                  fontWeight:
                                                      FontWeight.w700),
                                            ),
                                            Text(
                                              '${s['salesperson']} · ${s['date'] ?? ''}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            '₹${(s['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w800),
                                          ),
                                          Text(
                                            bucket,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color:
                                                  AppColors.textSecondary,
                                            ),
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
          ),
        ],
      ),
    );
  }
}
