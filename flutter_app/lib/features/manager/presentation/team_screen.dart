import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _teamDataProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.read(managerRepositoryProvider);
  final team = await repo.getTeam();
  final mon = await repo.getMonitoring();
  return {'team': team, 'monitoring': mon};
});

class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key});

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  Future<void> _showTransfer(Map<String, dynamic> m) async {
    final repo = ref.read(managerRepositoryProvider);
    List<Map<String, dynamic>> teams = [];
    try {
      teams = await repo.getCompanyTeams();
    } catch (_) {}

    int? selectedTeamId;
    final reasonCtrl = TextEditingController();

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Transfer ${m['name']}',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              if (teams.isEmpty)
                const Text('No teams available',
                    style: TextStyle(color: AppColors.textMuted)),
              if (teams.isNotEmpty)
                DropdownButtonFormField<int>(
                  decoration: const InputDecoration(labelText: 'Target team'),
                  items: teams
                      .map((t) => DropdownMenuItem(
                            value: t['id'] as int,
                            child: Text(t['name']?.toString() ?? ''),
                          ))
                      .toList(),
                  onChanged: (v) => setSt(() => selectedTeamId = v),
                ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Reason (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: selectedTeamId == null
                      ? null
                      : () async {
                          await repo.createTransferRequest(
                            userId: m['id'] as int,
                            targetTeamId: selectedTeamId!,
                            reason: reasonCtrl.text.trim().isEmpty
                                ? null
                                : reasonCtrl.text.trim(),
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                          ref.invalidate(_teamDataProvider);
                        },
                  child: const Text('Submit request'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    reasonCtrl.dispose();
  }

  Future<void> _confirmRemove(Map<String, dynamic> m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove from team?'),
        content: Text(
            'Remove ${m['full_name'] ?? m['name']} from this team?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(managerRepositoryProvider).removeTeamMember(m['id'] as int);
      ref.invalidate(_teamDataProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_teamDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load team',
          onRetry: () => ref.invalidate(_teamDataProvider),
        ),
        data: (bundle) {
          final team =
              List<Map<String, dynamic>>.from(bundle['team']?['team'] ?? []);
          final mon = bundle['monitoring'] as Map<String, dynamic>? ?? {};
          final summary = mon['team_summary'] as Map<String, dynamic>? ?? {};
          final members =
              List<Map<String, dynamic>>.from(mon['team_members'] ?? []);

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_teamDataProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    _StatChip(
                        label: 'Members',
                        value: '${summary['total_members'] ?? team.length}',
                        color: AppColors.primary),
                    const SizedBox(width: 10),
                    _StatChip(
                        label: 'Online',
                        value: '${summary['online'] ?? 0}',
                        color: AppColors.success),
                    const SizedBox(width: 10),
                    _StatChip(
                        label: 'Offline',
                        value: '${summary['offline'] ?? 0}',
                        color: AppColors.textMuted),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Live monitoring',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...members.map((m) => _MonitoringCard(
                      member: m,
                      onTap: () {
                        final id = m['id'];
                        if (id != null) context.push('/team/$id');
                      },
                      onTransfer: () => _showTransfer(m),
                    )),
                const SizedBox(height: 24),
                const Text('Roster',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...team.map((m) => _RosterTile(
                      member: m,
                      onTap: () {
                        final id = m['id'];
                        if (id != null) context.push('/team/$id');
                      },
                      onRemove: () => _confirmRemove(m),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatChip(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: color)),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _MonitoringCard extends StatelessWidget {
  final Map<String, dynamic> member;
  final VoidCallback onTap;
  final VoidCallback onTransfer;

  const _MonitoringCard({
    required this.member,
    required this.onTap,
    required this.onTransfer,
  });

  @override
  Widget build(BuildContext context) {
    final status = member['status']?.toString() ?? 'offline';
    Color c = AppColors.textMuted;
    if (status == 'online') c = AppColors.success;
    if (status == 'away') c = AppColors.warning;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: Theme.of(context).dividerColor.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(shape: BoxShape.circle, color: c),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(member['name']?.toString() ?? '',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  Text(
                      '${member['last_active'] ?? ''} · P:${member['pending_tasks'] ?? 0} O:${member['overdue_tasks'] ?? 0}',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.swap_horiz, size: 20),
              onPressed: onTransfer,
              tooltip: 'Transfer',
            ),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _RosterTile extends StatelessWidget {
  final Map<String, dynamic> member;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const _RosterTile({
    required this.member,
    required this.onTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: Theme.of(context).dividerColor.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(member['full_name']?.toString() ?? '',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  Text(member['email']?.toString() ?? '',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                  Text(
                      'Leads: ${member['lead_count'] ?? 0} · Orders: ${member['order_count'] ?? 0}',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textMuted)),
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.person_remove_outlined,
                  size: 20, color: AppColors.error.withOpacity(0.8)),
              onPressed: onRemove,
            ),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
