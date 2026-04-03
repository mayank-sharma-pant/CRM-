import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyAdminDashboardProvider);
    final user = ref.watch(authProvider).user;
    final platform = user?.isPlatformAdmin ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load admin dashboard',
          onRetry: () => ref.invalidate(companyAdminDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(companyAdminDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (platform)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Platform administrator — data may span all companies. Prefer the web console for sensitive changes.',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: List<Map<String, dynamic>>.from(d['stats'] ?? [])
                    .map((s) {
                  return SizedBox(
                    width: (MediaQuery.sizeOf(context).width - 42) / 2,
                    child: _StatCard(
                      label: s['label']?.toString() ?? '',
                      value: s['value']?.toString() ?? '',
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              const Text('Shortcuts',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ChipNav(
                      label: 'Staff',
                      icon: Icons.people_outline,
                      onTap: () => context.go('/admin-users')),
                  _ChipNav(
                      label: 'Teams',
                      icon: Icons.groups_outlined,
                      onTap: () => context.go('/admin-teams')),
                  _ChipNav(
                      label: 'Approvals',
                      icon: Icons.how_to_reg_outlined,
                      onTap: () => context.go('/admin-approvals')),
                ],
              ),
              if ((d['recent_activity'] as List?)?.isNotEmpty ?? false) ...[
                const SizedBox(height: 22),
                const Text('Recent activity',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...List<Map<String, dynamic>>.from(d['recent_activity'] ?? [])
                    .map((a) => ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(a['action']?.toString() ?? ''),
                          subtitle: Text(a['entity']?.toString() ?? ''),
                          trailing: Text(
                            a['time']?.toString() ?? '',
                            style: const TextStyle(fontSize: 11),
                          ),
                        )),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;

  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted)),
          const SizedBox(height: 6),
          Text(value,
              style:
                  const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _ChipNav extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _ChipNav({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
    );
  }
}
