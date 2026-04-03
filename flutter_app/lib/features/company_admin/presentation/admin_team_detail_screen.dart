import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

String _roleLabel(dynamic r) {
  if (r == null) return '';
  if (r is Map && r['value'] != null) return r['value'].toString();
  return r.toString();
}

class AdminTeamDetailScreen extends ConsumerStatefulWidget {
  final int teamId;

  const AdminTeamDetailScreen({super.key, required this.teamId});

  @override
  ConsumerState<AdminTeamDetailScreen> createState() =>
      _AdminTeamDetailScreenState();
}

class _AdminTeamDetailScreenState extends ConsumerState<AdminTeamDetailScreen> {
  Future<void> _rename(String current) async {
    final ctrl = TextEditingController(text: current);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename team'),
        content: TextField(controller: ctrl, autofocus: true),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Save')),
        ],
      ),
    );
    if (ok == true && ctrl.text.trim().isNotEmpty) {
      await ref
          .read(companyAdminRepositoryProvider)
          .updateTeam(widget.teamId, name: ctrl.text.trim());
      ref.invalidate(companyAdminTeamDetailProvider(widget.teamId));
      ref.invalidate(companyAdminTeamsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Updated')));
      }
    }
    ctrl.dispose();
  }

  Future<void> _addMember() async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add member by user ID'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'User ID'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Add')),
        ],
      ),
    );
    final id = int.tryParse(ctrl.text.trim());
    ctrl.dispose();
    if (ok == true && id != null) {
      await ref.read(companyAdminRepositoryProvider).addTeamMember(widget.teamId, id);
      ref.invalidate(companyAdminTeamDetailProvider(widget.teamId));
      ref.invalidate(companyAdminTeamsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Member added')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminTeamDetailProvider(widget.teamId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            onPressed: _addMember,
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load team',
          onRetry: () =>
              ref.invalidate(companyAdminTeamDetailProvider(widget.teamId)),
        ),
        data: (d) {
          final name = d['name']?.toString() ?? '';
          final members =
              List<Map<String, dynamic>>.from(d['members'] ?? []);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(name,
                        style: const TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w800)),
                  ),
                  TextButton(
                    onPressed: () => _rename(name),
                    child: const Text('Rename'),
                  ),
                ],
              ),
              Text('${d['member_count'] ?? members.length} members',
                  style: const TextStyle(color: AppColors.textMuted)),
              const Divider(height: 24),
              ...members.map((m) {
                final uid = m['id'] as int;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(m['name']?.toString() ?? ''),
                  subtitle: Text(_roleLabel(m['role'])),
                  trailing: IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 22),
                    onPressed: () async {
                      await ref
                          .read(companyAdminRepositoryProvider)
                          .removeTeamMember(widget.teamId, uid);
                      ref.invalidate(
                          companyAdminTeamDetailProvider(widget.teamId));
                      ref.invalidate(companyAdminTeamsProvider);
                    },
                  ),
                );
              }),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Delete team?'),
                      content: const Text(
                          'Memberships will be removed. Leads/clients may lose team linkage.'),
                      actions: [
                        TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancel')),
                        FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Delete')),
                      ],
                    ),
                  );
                  if (ok == true && mounted) {
                    await ref
                        .read(companyAdminRepositoryProvider)
                        .deleteTeam(widget.teamId);
                    ref.invalidate(companyAdminTeamsProvider);
                    if (context.mounted) context.pop();
                  }
                },
                child: Text('Delete team',
                    style: TextStyle(color: AppColors.error)),
              ),
            ],
          );
        },
      ),
    );
  }
}
