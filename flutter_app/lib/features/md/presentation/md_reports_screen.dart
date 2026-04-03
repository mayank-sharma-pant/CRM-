import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/md_repository.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final mdMonthlyPerformanceProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, DateTime>((ref, date) async {
  return ref.read(mdRepositoryProvider).getMonthlyPerformance(
        year: date.year,
        month: date.month,
      );
});

class MdReportsScreen extends ConsumerStatefulWidget {
  const MdReportsScreen({super.key});

  @override
  ConsumerState<MdReportsScreen> createState() => _MdReportsScreenState();
}

class _MdReportsScreenState extends ConsumerState<MdReportsScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month, 1);
  final _fmt = DateFormat('MMMM yyyy');

  void _shiftMonth(int delta) {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mdMonthlyPerformanceProvider(_month));

    return Scaffold(
      appBar: AppBar(
        title: const Text('MD reports',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => _shiftMonth(-1),
                ),
                Expanded(
                  child: Center(
                    child: Text(
                      _fmt.format(_month),
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => _shiftMonth(1),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load monthly performance',
                onRetry: () =>
                    ref.invalidate(mdMonthlyPerformanceProvider(_month)),
              ),
              data: (d) {
                final list =
                    List<Map<String, dynamic>>.from(d['leaderboard'] ?? []);
                if (list.isEmpty) {
                  return const Center(
                    child: Text(
                      'No sales performance for this month.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(mdMonthlyPerformanceProvider(_month)),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final r = list[i];
                      return _ReportRow(rank: i + 1, row: r);
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

class _ReportRow extends StatelessWidget {
  final int rank;
  final Map<String, dynamic> row;

  const _ReportRow({required this.rank, required this.row});

  @override
  Widget build(BuildContext context) {
    final name = row['name']?.toString() ?? '—';
    final email = row['email']?.toString() ?? '';
    final conv = row['converted_leads'] ?? 0;
    final total = row['total_leads'] ?? 0;
    final rate = row['conversion_rate'] ?? 0.0;
    final revenue = row['revenue'] ?? 0.0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppColors.primary.withOpacity(0.08),
            child: Text(
              '$rank',
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14)),
                if (email.isNotEmpty)
                  Text(email,
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                Text(
                  'Leads $total · Converted $conv · ${rate.toString()}%',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹${revenue.toString()}',
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w800)),
              const Text('Revenue',
                  style: TextStyle(
                      fontSize: 10, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }
}

