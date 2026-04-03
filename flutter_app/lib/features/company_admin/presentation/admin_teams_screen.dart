import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminTeamsScreen extends ConsumerWidget {
  const AdminTeamsScreen({super.key});

  Future<void> _createTeam(BuildContext context, WidgetRef ref) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New team'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(hintText: 'Team name'),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Create')),
        ],
      ),
    );
    if (ok == true && ctrl.text.trim().isNotEmpty) {
      await ref.read(companyAdminRepositoryProvider).createTeam(ctrl.text.trim());
      ref.invalidate(companyAdminTeamsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Team created')));
      }
    }
    ctrl.dispose();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyAdminTeamsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Teams',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createTeam(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Team'),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load teams',
          onRetry: () => ref.invalidate(companyAdminTeamsProvider),
        ),
        data: (d) {
          final teams = List<Map<String, dynamic>>.from(d['teams'] ?? []);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(companyAdminTeamsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: teams.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final t = teams[i];
                final id = t['id'] as int;
                final mgr = t['manager'] as Map<String, dynamic>?;
                return Material(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => context.push('/admin-teams/$id'),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          const Icon(Icons.groups_outlined, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t['name']?.toString() ?? 'Team',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16)),
                                Text(
                                  mgr != null
                                      ? 'Manager: ${mgr['name']}'
                                      : 'No manager',
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                          Text('${t['member_count'] ?? 0}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700)),
                        ],
                      ),
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
