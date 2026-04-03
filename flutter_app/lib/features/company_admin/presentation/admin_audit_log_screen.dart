import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminAuditLogScreen extends ConsumerStatefulWidget {
  const AdminAuditLogScreen({super.key});

  @override
  ConsumerState<AdminAuditLogScreen> createState() =>
      _AdminAuditLogScreenState();
}

class _AdminAuditLogScreenState extends ConsumerState<AdminAuditLogScreen> {
  int _days = 7;
  final _fmt = DateFormat('dd MMM yyyy, HH:mm');

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminAuditLogProvider(_days));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit log',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          PopupMenuButton<int>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Period',
            onSelected: (v) => setState(() => _days = v),
            itemBuilder: (_) => [7, 14, 30, 90]
                .map((d) => PopupMenuItem(
                    value: d,
                    child: Text('Last $d days',
                        style: TextStyle(
                            fontWeight:
                                d == _days ? FontWeight.bold : FontWeight.normal))))
                .toList(),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load audit log',
          onRetry: () => ref.invalidate(companyAdminAuditLogProvider(_days)),
        ),
        data: (d) {
          final logs =
              List<Map<String, dynamic>>.from(d['logs'] ?? d['entries'] ?? []);
          if (logs.isEmpty) {
            return Center(
              child: Text('No entries in the last $_days days',
                  style: const TextStyle(color: AppColors.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(companyAdminAuditLogProvider(_days)),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: logs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final log = logs[i];
                final action =
                    log['action']?.toString() ?? log['event']?.toString() ?? '—';
                final actor =
                    log['actor']?.toString() ?? log['user']?.toString() ?? '';
                final ts = log['timestamp'] ?? log['created_at'];
                String timeStr = '';
                if (ts != null) {
                  try {
                    timeStr = _fmt.format(DateTime.parse(ts.toString()));
                  } catch (_) {
                    timeStr = ts.toString();
                  }
                }
                final detail = log['details']?.toString() ??
                    log['description']?.toString() ??
                    '';

                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: Theme.of(context)
                            .dividerColor
                            .withOpacity(0.12)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(action,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13)),
                          ),
                          Text(timeStr,
                              style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.textMuted)),
                        ],
                      ),
                      if (actor.isNotEmpty)
                        Text(actor,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary)),
                      if (detail.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(detail,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted)),
                        ),
                    ],
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
