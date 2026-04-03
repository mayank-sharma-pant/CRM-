import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformLogsScreen extends ConsumerStatefulWidget {
  const CrmPlatformLogsScreen({super.key});

  @override
  ConsumerState<CrmPlatformLogsScreen> createState() =>
      _CrmPlatformLogsScreenState();
}

class _CrmPlatformLogsScreenState
    extends ConsumerState<CrmPlatformLogsScreen> {
  int _days = 7;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(crmPlatformLogsProvider(_days));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform audit',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          PopupMenuButton<int>(
            initialValue: _days,
            onSelected: (v) {
              setState(() {
                _days = v;
              });
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 7, child: Text('Last 7 days')),
              PopupMenuItem(value: 14, child: Text('Last 14 days')),
              PopupMenuItem(value: 30, child: Text('Last 30 days')),
              PopupMenuItem(value: 90, child: Text('Last 90 days')),
            ],
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load logs',
          onRetry: () => ref.invalidate(crmPlatformLogsProvider(_days)),
        ),
        data: (d) {
          final logs = List<Map<String, dynamic>>.from(d['logs'] ?? []);
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(crmPlatformLogsProvider(_days)),
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
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textMuted),
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
