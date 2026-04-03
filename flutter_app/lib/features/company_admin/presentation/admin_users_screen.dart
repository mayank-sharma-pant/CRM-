import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
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

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
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
                final filtered = _search.isEmpty
                    ? raw
                    : raw.where((u) {
                        final blob =
                            '${u['name']} ${u['email']} ${u['role']}'
                                .toLowerCase();
                        return blob.contains(_search);
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
                                        '${u['role']} · ${u['status']}',
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
}
