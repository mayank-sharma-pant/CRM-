import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  String _search = '';
  String? _statusFilter;
  String? _roleFilter;

  Future<void> _showInviteDialog() async {
    final emailCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String role = 'sales';
    int? teamId;

    final teams = ref.read(companyAdminTeamsProvider).valueOrNull;
    final teamList =
        List<Map<String, dynamic>>.from(teams?['teams'] ?? []);

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDlgState) {
            return AlertDialog(
              title: const Text('Invite member'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: emailCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Email *'),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: nameCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Full name *'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: phoneCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Phone *'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: role,
                      decoration:
                          const InputDecoration(labelText: 'Role *'),
                      items: const [
                        DropdownMenuItem(
                            value: 'sales', child: Text('Sales')),
                        DropdownMenuItem(
                            value: 'manager', child: Text('Manager')),
                        DropdownMenuItem(value: 'md', child: Text('MD')),
                        DropdownMenuItem(
                            value: 'purchase', child: Text('Purchase')),
                        DropdownMenuItem(
                            value: 'admin', child: Text('Admin')),
                      ],
                      onChanged: (v) =>
                          setDlgState(() => role = v ?? 'sales'),
                    ),
                    if (['sales', 'manager'].contains(role) &&
                        teamList.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      DropdownButtonFormField<int?>(
                        value: teamId,
                        decoration:
                            const InputDecoration(labelText: 'Team'),
                        items: [
                          const DropdownMenuItem<int?>(
                              value: null, child: Text('No team')),
                          ...teamList.map((t) => DropdownMenuItem<int?>(
                                value: t['id'] as int,
                                child:
                                    Text(t['name']?.toString() ?? ''),
                              )),
                        ],
                        onChanged: (v) =>
                            setDlgState(() => teamId = v),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Send invite')),
              ],
            );
          },
        );
      },
    );

    if (ok == true &&
        emailCtrl.text.trim().isNotEmpty &&
        nameCtrl.text.trim().isNotEmpty) {
      try {
        await ref.read(companyAdminRepositoryProvider).createInvite({
          'email': emailCtrl.text.trim(),
          'full_name': nameCtrl.text.trim(),
          'phone': phoneCtrl.text.trim(),
          'role': role,
          if (teamId != null) 'team_id': teamId,
        });
        ref.invalidate(companyAdminUsersProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Invite sent')));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Invite failed: $e')));
        }
      }
    }

    emailCtrl.dispose();
    nameCtrl.dispose();
    phoneCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            onPressed: _showInviteDialog,
            tooltip: 'Invite member',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search name or email…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Row(
              children: [
                _buildFilterChip('All', _statusFilter == null,
                    () => setState(() => _statusFilter = null)),
                _buildFilterChip('Active', _statusFilter == 'active',
                    () => setState(() => _statusFilter = 'active')),
                _buildFilterChip('Pending', _statusFilter == 'pending',
                    () => setState(() => _statusFilter = 'pending')),
                _buildFilterChip('Disabled', _statusFilter == 'disabled',
                    () => setState(() => _statusFilter = 'disabled')),
                const SizedBox(width: 12),
                _buildFilterChip('All roles', _roleFilter == null,
                    () => setState(() => _roleFilter = null)),
                for (final r in ['sales', 'manager', 'md', 'admin', 'purchase'])
                  _buildFilterChip(r, _roleFilter == r,
                      () => setState(() => _roleFilter = r)),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load users',
                onRetry: () => ref.invalidate(companyAdminUsersProvider),
              ),
              data: (d) {
                final raw =
                    List<Map<String, dynamic>>.from(d['users'] ?? []);
                final filtered = raw.where((u) {
                  if (_search.isNotEmpty) {
                    final blob =
                        '${u['name']} ${u['email']} ${u['role']}'
                            .toLowerCase();
                    if (!blob.contains(_search)) return false;
                  }
                  if (_statusFilter != null &&
                      u['status']?.toString().toLowerCase() !=
                          _statusFilter) {
                    return false;
                  }
                  if (_roleFilter != null &&
                      u['role']?.toString().toLowerCase() !=
                          _roleFilter) {
                    return false;
                  }
                  return true;
                }).toList();

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(companyAdminUsersProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final u = filtered[i];
                      final uid = u['user_id'] as int;
                      return Material(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => context.push('/admin-users/$uid'),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor:
                                      AppColors.primary.withOpacity(0.1),
                                  child: Text(
                                    (u['name']?.toString() ?? '?')[0]
                                        .toUpperCase(),
                                    style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        u['name']?.toString() ?? '—',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                      Text(
                                        u['email']?.toString() ?? '',
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary),
                                      ),
                                      Text(
                                        '${u['role']} · ${u['status']}${u['team'] != null ? ' · ${u['team']}' : ''}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(u['id']?.toString() ?? '',
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600)),
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
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool selected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}
