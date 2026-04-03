import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/md_repository.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final mdPointsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getPoints();
});

class MdPointsScreen extends ConsumerStatefulWidget {
  const MdPointsScreen({super.key});

  @override
  ConsumerState<MdPointsScreen> createState() => _MdPointsScreenState();
}

class _MdPointsScreenState extends ConsumerState<MdPointsScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mdPointsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Incentive engine',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search by name or ID…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load points',
                onRetry: () => ref.invalidate(mdPointsProvider),
              ),
              data: (d) {
                final summary =
                    Map<String, dynamic>.from(d['summary'] ?? const {});
                final raw =
                    List<Map<String, dynamic>>.from(d['performance'] ?? []);
                final list = raw.where((p) {
                  if (_search.isEmpty) return true;
                  final blob =
                      '${p['name']} ${p['id']}'.toString().toLowerCase();
                  return blob.contains(_search);
                }).toList();

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(mdPointsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _SummaryHeader(summary: summary, count: list.length);
                      }
                      final p = list[index - 1];
                      return _PointsTile(p: p);
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

class _SummaryHeader extends StatelessWidget {
  final Map<String, dynamic> summary;
  final int count;

  const _SummaryHeader({required this.summary, required this.count});

  @override
  Widget build(BuildContext context) {
    final totalPoints = summary['totalPoints'] ?? 0;
    final totalBonus = summary['totalBonus'] ?? 0;
    final top = summary['topPerformer']?.toString() ?? '—';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _KpiChip(
                label: 'Aggregate points',
                value: '$totalPoints',
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _KpiChip(
                label: 'Bonus pool',
                value: '₹$totalBonus',
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _KpiChip(
          label: 'Top performer',
          value: '$top ($count users)',
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _KpiChip extends StatelessWidget {
  final String label;
  final String value;

  const _KpiChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textMuted)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _PointsTile extends StatelessWidget {
  final Map<String, dynamic> p;

  const _PointsTile({required this.p});

  @override
  Widget build(BuildContext context) {
    final name = p['name']?.toString() ?? '—';
    final id = p['id']?.toString() ?? '';
    final role = p['role']?.toString() ?? '';
    final tier = p['tier']?.toString() ?? '';
    final pts = p['points'] ?? 0;
    final bonus = p['bonus_amount'] ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
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
              backgroundColor: AppColors.primary.withOpacity(0.1),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.w700),
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
                  Text('$id · $role',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                  Text('Tier: $tier',
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textMuted)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('$pts pts',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 13)),
                Text('₹$bonus',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

