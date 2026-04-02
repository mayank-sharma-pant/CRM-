import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdPerformanceScreen extends ConsumerStatefulWidget {
  const MdPerformanceScreen({super.key});

  @override
  ConsumerState<MdPerformanceScreen> createState() =>
      _MdPerformanceScreenState();
}

class _MdPerformanceScreenState extends ConsumerState<MdPerformanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final salesAsync = ref.watch(mdSalesProvider);
    final monAsync = ref.watch(mdMonitoringProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Performance',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Sales'),
            Tab(text: 'Monitoring'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          salesAsync.when(
            loading: () => const LoadingIndicator(),
            error: (e, _) => ErrorBanner(
              message: 'Failed to load sales analytics',
              onRetry: () => ref.invalidate(mdSalesProvider),
            ),
            data: (d) => RefreshIndicator(
              onRefresh: () async => ref.invalidate(mdSalesProvider),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _SummaryCard(
                      summary: Map<String, dynamic>.from(d['summary'] ?? {})),
                  const SizedBox(height: 16),
                  Text(d['trendObservation']?.toString() ?? '',
                      style: TextStyle(
                          fontSize: 13, color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  const Text('Team performance',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...List<Map<String, dynamic>>.from(
                          d['team_performance'] ?? [])
                      .map((t) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(t['team']?.toString() ?? ''),
                              subtitle: Text(
                                  'Leads ${t['leads']} · Won ${t['won']} · ${t['win_rate']}%'),
                            ),
                          )),
                  if ((d['aiInsights'] as List?)?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 12),
                    const Text('Insights',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700)),
                    ...List<Map<String, dynamic>>.from(d['aiInsights'] ?? [])
                        .map((i) => ListTile(
                              leading: const Icon(Icons.auto_awesome_outlined,
                                  size: 20, color: AppColors.primary),
                              title: Text(i['title']?.toString() ?? ''),
                              subtitle: Text(
                                  (i['evidence'] as List?)?.first?.toString() ??
                                      ''),
                            )),
                  ],
                ],
              ),
            ),
          ),
          monAsync.when(
            loading: () => const LoadingIndicator(),
            error: (e, _) => ErrorBanner(
              message: 'Failed to load monitoring',
              onRetry: () => ref.invalidate(mdMonitoringProvider),
            ),
            data: (d) => RefreshIndicator(
              onRefresh: () async => ref.invalidate(mdMonitoringProvider),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  ...List<Map<String, dynamic>>.from(d['alerts'] ?? [])
                      .map((a) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            color: AppColors.error.withOpacity(0.06),
                            child: ListTile(
                              leading: const Icon(Icons.warning_amber_outlined,
                                  color: AppColors.error),
                              title: Text(a['title']?.toString() ?? ''),
                              subtitle: Text(a['message']?.toString() ?? ''),
                              trailing: Chip(
                                label: Text(a['severity']?.toString() ?? '',
                                    style: const TextStyle(fontSize: 10)),
                              ),
                            ),
                          )),
                  const SizedBox(height: 12),
                  const Text('Team status',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ...List<Map<String, dynamic>>.from(d['team_status'] ?? [])
                      .map((t) => ListTile(
                            title: Text(t['team']?.toString() ?? ''),
                            trailing: Text('${t['leads']} leads'),
                          )),
                  const SizedBox(height: 12),
                  const Text('AI interpretation',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ...List<Map<String, dynamic>>.from(
                          d['ai_interpretation'] ?? [])
                      .map((x) => ListTile(
                            dense: true,
                            title: Text(x['title']?.toString() ?? ''),
                            subtitle: Text(
                                (x['evidence'] as List?)?.join(', ') ?? ''),
                          )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final Map<String, dynamic> summary;

  const _SummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: Wrap(
        spacing: 16,
        runSpacing: 8,
        children: [
          _Chip('Total', '${summary['total_deals'] ?? '—'}'),
          _Chip('Active', '${summary['active'] ?? '—'}'),
          _Chip('Won', '${summary['won'] ?? '—'}'),
          _Chip('Win rate', '${summary['win_rate'] ?? '—'}%'),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final String value;

  const _Chip(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        Text(value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      ],
    );
  }
}
