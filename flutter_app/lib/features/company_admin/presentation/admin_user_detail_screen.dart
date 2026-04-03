import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

const _roles = ['sales', 'manager', 'md', 'admin', 'purchase'];

class AdminUserDetailScreen extends ConsumerStatefulWidget {
  final int userId;

  const AdminUserDetailScreen({super.key, required this.userId});

  @override
  ConsumerState<AdminUserDetailScreen> createState() =>
      _AdminUserDetailScreenState();
}

class _AdminUserDetailScreenState extends ConsumerState<AdminUserDetailScreen> {
  String _roleStr(dynamic r) {
    if (r == null) return 'sales';
    if (r is Map && r['value'] != null) return r['value'].toString();
    return r.toString();
  }

  String _statusStr(dynamic s) {
    if (s == null) return 'active';
    if (s is Map && s['value'] != null) return s['value'].toString();
    return s.toString();
  }

  Future<void> _save(
    String role,
    int? teamId,
    String status,
  ) async {
    final repo = ref.read(companyAdminRepositoryProvider);
    await repo.updateUser(widget.userId, {
      'role': role,
      'team_id': teamId ?? 0,
      'status': status,
    });
    ref.invalidate(companyAdminUserDetailProvider(widget.userId));
    ref.invalidate(companyAdminUsersProvider);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminUserDetailProvider(widget.userId));
    final teamsAsync = ref.watch(companyAdminTeamsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('User',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load user',
          onRetry: () =>
              ref.invalidate(companyAdminUserDetailProvider(widget.userId)),
        ),
        data: (d) {
          final role = _roleStr(d['role']);
          final status = _statusStr(d['status']);
          final teamId = d['team_id'] as int?;
          final teams = teamsAsync.valueOrNull;
          final teamList = teams != null
              ? List<Map<String, dynamic>>.from(teams['teams'] ?? [])
              : <Map<String, dynamic>>[];

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(d['name']?.toString() ?? '—',
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800)),
              Text(d['email']?.toString() ?? '',
                  style: TextStyle(color: AppColors.textSecondary)),
              Text(d['formatted_id']?.toString() ?? '',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted)),
              const Divider(height: 28),
              const Text('Role',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _roles.contains(role.toLowerCase())
                    ? role.toLowerCase()
                    : 'sales',
                items: _roles
                    .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                    .toList(),
                onChanged: (v) async {
                  if (v == null) return;
                  await _save(v, teamId, status);
                },
              ),
              const SizedBox(height: 16),
              const Text('Status',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: ['active', 'pending', 'disabled']
                        .contains(status.toLowerCase())
                    ? status.toLowerCase()
                    : 'active',
                items: const [
                  DropdownMenuItem(value: 'active', child: Text('active')),
                  DropdownMenuItem(value: 'pending', child: Text('pending')),
                  DropdownMenuItem(value: 'disabled', child: Text('disabled')),
                ],
                onChanged: (v) async {
                  if (v == null) return;
                  await _save(role, teamId, v);
                },
              ),
              const SizedBox(height: 16),
              const Text('Primary team',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              const SizedBox(height: 6),
              DropdownButtonFormField<int?>(
                value: teamId != null &&
                        teamList.any((t) => t['id'] == teamId)
                    ? teamId
                    : null,
                hint: const Text('No team'),
                items: [
                  const DropdownMenuItem<int?>(
                      value: null, child: Text('No team')),
                  ...teamList.map((t) => DropdownMenuItem<int?>(
                        value: t['id'] as int,
                        child: Text(t['name']?.toString() ?? ''),
                      )),
                ],
                onChanged: teamsAsync.isLoading
                    ? null
                    : (v) async {
                        await _save(role, v, status);
                      },
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  TextButton(
                    onPressed: () async {
                      final repo = ref.read(companyAdminRepositoryProvider);
                      await repo.activateUser(widget.userId);
                      ref.invalidate(companyAdminUserDetailProvider(widget.userId));
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Activated')));
                      }
                    },
                    child: const Text('Activate'),
                  ),
                  TextButton(
                    onPressed: () async {
                      final repo = ref.read(companyAdminRepositoryProvider);
                      await repo.disableUser(widget.userId);
                      ref.invalidate(companyAdminUserDetailProvider(widget.userId));
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Disabled')));
                      }
                    },
                    child: const Text('Disable'),
                  ),
                ],
              ),
              if (ref.watch(authProvider).user?.id != widget.userId)
                TextButton(
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Delete user?'),
                        content: const Text(
                            'This cannot be undone. Reject pending users from Approvals instead when possible.'),
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
                    if (ok == true && context.mounted) {
                      await ref
                          .read(companyAdminRepositoryProvider)
                          .deleteUser(widget.userId);
                      ref.invalidate(companyAdminUsersProvider);
                      if (context.mounted) Navigator.of(context).pop();
                    }
                  },
                  child: Text('Delete user',
                      style: TextStyle(color: AppColors.error)),
                ),
            ],
          );
        },
      ),
    );
  }
}
