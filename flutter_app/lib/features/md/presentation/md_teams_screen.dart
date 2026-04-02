import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdTeamsScreen extends ConsumerWidget {
  const MdTeamsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mdTeamsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Teams',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load teams',
          onRetry: () => ref.invalidate(mdTeamsProvider),
        ),
        data: (d) {
          final teams = List<Map<String, dynamic>>.from(d['teams'] ?? []);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(mdTeamsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: teams.length,
              itemBuilder: (_, i) {
                final t = teams[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t['name']?.toString() ?? 'Team',
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(
                          'Manager: ${t['manager']}',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const Divider(height: 20),
                        _StatRow('Sales members', '${t['member_count']}'),
                        _StatRow('Leads', '${t['total_leads']}'),
                        _StatRow('Converted', '${t['converted_leads']}'),
                        _StatRow(
                            'Conv. rate', '${t['conversion_rate']}%'),
                        _StatRow('Revenue (paid)',
                            '₹${(t['revenue'] as num?)?.toStringAsFixed(0) ?? '0'}'),
                        _StatRow('Orders', '${t['order_count']}'),
                        if ((t['members'] as List?)?.isNotEmpty ?? false) ...[
                          const SizedBox(height: 12),
                          const Text('Members',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 12)),
                          const SizedBox(height: 6),
                          ...List<Map<String, dynamic>>.from(t['members'] ?? [])
                              .map((m) => ListTile(
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(
                                        m['full_name']?.toString() ?? ''),
                                    subtitle: Text(
                                        m['role']?.toString() ?? ''),
                                  )),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String k;
  final String v;

  const _StatRow(this.k, this.v);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
