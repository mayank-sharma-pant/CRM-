import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdDashboardScreen extends ConsumerWidget {
  const MdDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mdDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Executive Dashboard',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load MD dashboard',
          onRetry: () => ref.invalidate(mdDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(mdDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _KpiGrid(kpis: List<Map<String, dynamic>>.from(d['kpis'] ?? [])),
              const SizedBox(height: 20),
              const Text('Pipeline',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              _StageRow(
                stages: List<Map<String, dynamic>>.from(
                    d['pipelineSummary']?['stageDistribution'] ?? []),
              ),
              const SizedBox(height: 20),
              const Text('Finance snapshot',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              _FinanceRow(
                items: List<Map<String, dynamic>>.from(
                    d['financeSnapshot']?['invoiceHealth'] ?? []),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/revenue'),
                      icon: const Icon(Icons.payments_outlined, size: 18),
                      label: const Text('Revenue'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/teams'),
                      icon: const Icon(Icons.groups_outlined, size: 18),
                      label: const Text('Teams'),
                    ),
                  ),
                ],
              ),
              if ((d['aiBrief'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 22),
                const Text('AI brief',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...List<Map<String, dynamic>>.from(d['aiBrief'] ?? [])
                    .map((b) => _BriefCard(
                          title: b['title']?.toString() ?? '',
                          summary: b['summary']?.toString() ?? '',
                        )),
              ],
              const SizedBox(height: 16),
              _TrendWatch(
                items: List<Map<String, dynamic>>.from(
                    d['trendWatchlist'] ?? []),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final List<Map<String, dynamic>> kpis;

  const _KpiGrid({required this.kpis});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: kpis.map((k) {
        return SizedBox(
          width: (MediaQuery.sizeOf(context).width - 42) / 2,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: Theme.of(context).dividerColor.withOpacity(0.12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  k['label']?.toString() ?? '',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted),
                ),
                const SizedBox(height: 6),
                Text(
                  k['value']?.toString() ?? '—',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _StageRow extends StatelessWidget {
  final List<Map<String, dynamic>> stages;

  const _StageRow({required this.stages});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: stages.map((s) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Chip(
              label: Text(
                  '${s['stage']}: ${s['count']}',
                  style: const TextStyle(fontSize: 12)),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _FinanceRow extends StatelessWidget {
  final List<Map<String, dynamic>> items;

  const _FinanceRow({required this.items});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: items.map((i) {
        return Expanded(
          child: Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: Theme.of(context).dividerColor.withOpacity(0.12)),
            ),
            child: Column(
              children: [
                Text(i['name']?.toString() ?? '',
                    style: const TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w600)),
                Text('${i['value']}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _BriefCard extends StatelessWidget {
  final String title;
  final String summary;

  const _BriefCard({required this.title, required this.summary});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(summary,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _TrendWatch extends StatelessWidget {
  final List<Map<String, dynamic>> items;

  const _TrendWatch({required this.items});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: items.map((t) {
        return Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: Theme.of(context).dividerColor.withOpacity(0.12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t['name']?.toString() ?? '',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textMuted)),
                Text(t['delta']?.toString() ?? '',
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
