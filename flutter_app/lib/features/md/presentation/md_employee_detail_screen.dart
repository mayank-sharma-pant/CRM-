import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class MdEmployeeDetailScreen extends ConsumerWidget {
  final int userId;

  const MdEmployeeDetailScreen({super.key, required this.userId});

  static String _roleStr(dynamic r) {
    if (r == null) return '';
    if (r is Map && r['value'] != null) return r['value'].toString();
    return r.toString();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mdEmployeeDetailProvider(userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load employee',
          onRetry: () => ref.invalidate(mdEmployeeDetailProvider(userId)),
        ),
        data: (d) {
          final emp = Map<String, dynamic>.from(d['employee'] ?? {});
          final perf = Map<String, dynamic>.from(d['performance'] ?? {});
          final teamPerf =
              Map<String, dynamic>.from(d['team_performance'] ?? {});

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  child: Text(
                    (emp['name']?.toString() ?? '?')[0].toUpperCase(),
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary),
                  ),
                ),
                title: Text(emp['name']?.toString() ?? '—',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700)),
                subtitle: Text(emp['email']?.toString() ?? ''),
              ),
              const SizedBox(height: 8),
              _Row('Employee ID', emp['formatted_id']?.toString() ?? '—'),
              _Row('Role', _roleStr(emp['role'])),
              _Row('Team', emp['team']?.toString() ?? '—'),
              _Row('Status', emp['status']?.toString() ?? '—'),
              if (emp['phone'] != null)
                _Row('Phone', emp['phone'].toString()),
              const Divider(height: 28),
              const Text('Performance',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              _Row('Assigned leads', '${perf['leads'] ?? '—'}'),
              _Row('Converted', '${perf['converted'] ?? '—'}'),
              const Divider(height: 28),
              const Text('Team context',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              _Row('Team leads', '${teamPerf['leads'] ?? '—'}'),
              _Row('Team converted', '${teamPerf['converted'] ?? '—'}'),
              _Row('Avg leads / member',
                  '${teamPerf['avg_leads_per_member'] ?? '—'}'),
            ],
          );
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;

  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label,
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
