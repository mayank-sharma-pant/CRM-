import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdInvoicesScreen extends ConsumerStatefulWidget {
  const MdInvoicesScreen({super.key});

  @override
  ConsumerState<MdInvoicesScreen> createState() => _MdInvoicesScreenState();
}

class _MdInvoicesScreenState extends ConsumerState<MdInvoicesScreen> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mdInvoicesListProvider(_status));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company invoices',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: _status == null,
                    onTap: () => setState(() => _status = null),
                  ),
                  _FilterChip(
                    label: 'Paid',
                    selected: _status == 'Paid',
                    onTap: () => setState(() => _status = 'Paid'),
                  ),
                  _FilterChip(
                    label: 'Pending',
                    selected: _status == 'Pending',
                    onTap: () => setState(() => _status = 'Pending'),
                  ),
                  _FilterChip(
                    label: 'Overdue',
                    selected: _status == 'Overdue',
                    onTap: () => setState(() => _status = 'Overdue'),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load invoices',
                onRetry: () =>
                    ref.invalidate(mdInvoicesListProvider(_status)),
              ),
              data: (d) {
                final list =
                    List<Map<String, dynamic>>.from(d['invoices'] ?? []);
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(mdInvoicesListProvider(_status)),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final inv = list[i];
                      final dbId = inv['db_id'] as int?;
                      return Material(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: dbId == null
                              ? null
                              : () => context.push('/invoices/$dbId'),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        inv['id']?.toString() ?? 'Invoice',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary
                                            .withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        inv['status']?.toString() ?? '',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(inv['client']?.toString() ?? '',
                                    style: TextStyle(
                                        color: AppColors.textSecondary)),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(inv['amount']?.toString() ?? '',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    Text(
                                        '${inv['sales_rep_name']} · ${inv['paymentStatus']}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted)),
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
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
