import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _perfReportProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(managerRepositoryProvider).getTeamPerformanceReport();
});

class ManagerReportsScreen extends ConsumerWidget {
  const ManagerReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_perfReportProvider);
    final fmt = NumberFormat.compactCurrency(symbol: '₹', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team reports',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load report',
          onRetry: () => ref.invalidate(_perfReportProvider),
        ),
        data: (data) {
          final totals = data['team_totals'] as Map<String, dynamic>? ?? {};
          final members =
              List<Map<String, dynamic>>.from(data['member_breakdown'] ?? []);

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_perfReportProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Period: ${data['period'] ?? 'month'}',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: Theme.of(context)
                            .dividerColor
                            .withOpacity(0.12)),
                  ),
                  child: Column(
                    children: [
                      _TotRow('Leads (team)', '${totals['leads_created'] ?? 0}'),
                      _TotRow('Converted', '${totals['leads_converted'] ?? 0}'),
                      _TotRow(
                          'Conversion %',
                          '${totals['conversion_rate'] ?? 0}%'),
                      _TotRow('Revenue (paid scope)',
                          fmt.format((totals['revenue'] as num?)?.toDouble() ?? 0)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Text('By rep',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...members.map((m) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: Theme.of(context)
                                .dividerColor
                                .withOpacity(0.12)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(m['name']?.toString() ?? '',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                          ),
                          Text('L:${m['leads'] ?? 0}',
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.primary)),
                          const SizedBox(width: 12),
                          Text('C:${m['converted'] ?? 0}',
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.success)),
                        ],
                      ),
                    )),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'As of ${DateFormat('MMM d, y').format(DateTime.now())}',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TotRow extends StatelessWidget {
  final String label;
  final String value;

  const _TotRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppColors.textSecondary)),
          Text(value,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        ],
      ),
    );
  }
}
