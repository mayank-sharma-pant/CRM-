import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformLogsScreen extends ConsumerWidget {
  const CrmPlatformLogsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformLogsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform audit',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load logs',
          onRetry: () => ref.invalidate(crmPlatformLogsProvider),
        ),
        data: (d) {
          final logs = List<Map<String, dynamic>>.from(d['logs'] ?? []);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(crmPlatformLogsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: logs.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final l = logs[i];
                return ListTile(
                  dense: true,
                  title: Text(l['action']?.toString() ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                      '${l['performed_by'] ?? '—'} · Company ${l['company_id'] ?? '—'}'),
                  trailing: Text(
                    l['timestamp']?.toString().split('T').first ?? '',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
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
