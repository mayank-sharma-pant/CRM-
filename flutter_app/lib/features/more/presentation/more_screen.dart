import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/notifications/providers/notifications_provider.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    final isMgr = user?.isManager ?? false;
    final isMd = user?.isMD ?? false;
    final isAdmin = user?.isAdmin ?? false;
    final isPurchase = user?.isPurchase ?? false;
    final isPlatformCrm = user?.isPlatformAdmin ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('More',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (user != null) ...[
            GestureDetector(
              onTap: () => context.push('/profile'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color:
                          Theme.of(context).dividerColor.withOpacity(0.12)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: Text(
                        user.fullName.isNotEmpty
                            ? user.fullName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.fullName,
                              style: const TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w600)),
                          Text(user.email,
                              style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        user.role.toUpperCase(),
                        style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (isPlatformCrm) ...[
            _SectionLabel(label: 'CRM Platform'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.pending_actions_outlined,
              label: 'Pending signups',
              onTap: () => context.push('/platform-pending'),
            ),
            _MenuItem(
              icon: Icons.business_outlined,
              label: 'All companies',
              onTap: () => context.push('/platform-companies'),
            ),
            _MenuItem(
              icon: Icons.list_alt_outlined,
              label: 'Audit log',
              onTap: () => context.push('/platform-logs'),
            ),
            _MenuItem(
              icon: Icons.workspace_premium_outlined,
              label: 'Plans',
              onTap: () => context.push('/platform-plans'),
            ),
            _MenuItem(
              icon: Icons.verified_user_outlined,
              label: 'Platform session',
              onTap: () => context.push('/platform-session'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ] else if (isAdmin) ...[
            _SectionLabel(label: 'Administration'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.people_outline,
              label: 'Staff',
              onTap: () => context.push('/admin-users'),
            ),
            _MenuItem(
              icon: Icons.groups_outlined,
              label: 'Teams',
              onTap: () => context.push('/admin-teams'),
            ),
            _MenuItem(
              icon: Icons.how_to_reg_outlined,
              label: 'Approvals',
              onTap: () => context.push('/admin-approvals'),
            ),
            _MenuItem(
              icon: Icons.account_tree_outlined,
              label: 'Hierarchy',
              onTap: () => context.push('/admin-hierarchy'),
            ),
            _MenuItem(
              icon: Icons.history_outlined,
              label: 'Audit log',
              onTap: () => context.push('/admin-audit-log'),
            ),
            _MenuItem(
              icon: Icons.settings_applications_outlined,
              label: 'Company settings',
              onTap: () => context.push('/admin-settings'),
            ),
            _MenuItem(
              icon: Icons.people_outline,
              label: 'Leads',
              onTap: () => context.push('/leads'),
            ),
            _MenuItem(
              icon: Icons.business_outlined,
              label: 'Clients',
              onTap: () => context.push('/clients'),
            ),
            _MenuItem(
              icon: Icons.check_circle_outline,
              label: 'Tasks',
              onTap: () => context.push('/tasks'),
            ),
            _MenuItem(
              icon: Icons.bar_chart_outlined,
              label: 'Performance',
              onTap: () => context.push('/performance'),
            ),
            _MenuItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock / Inventory',
              onTap: () => context.push('/stock'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ] else if (isPurchase) ...[
            _SectionLabel(label: 'Purchase'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.fact_check_outlined,
              label: 'Sales approvals',
              onTap: () => context.push('/purchase-sales'),
            ),
            _MenuItem(
              icon: Icons.receipt_long_outlined,
              label: 'Invoices',
              onTap: () => context.push('/purchase-invoices'),
            ),
            _MenuItem(
              icon: Icons.analytics_outlined,
              label: 'Monitoring',
              onTap: () => context.push('/purchase-monitoring'),
            ),
            _MenuItem(
              icon: Icons.business_outlined,
              label: 'Clients',
              onTap: () => context.push('/clients'),
            ),
            _MenuItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock / Inventory',
              onTap: () => context.push('/stock'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ] else if (isMd) ...[
            _SectionLabel(label: 'Executive'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.payments_outlined,
              label: 'Revenue',
              onTap: () => context.push('/revenue'),
            ),
            _MenuItem(
              icon: Icons.groups_outlined,
              label: 'Teams',
              onTap: () => context.push('/teams'),
            ),
            _MenuItem(
              icon: Icons.bar_chart_outlined,
              label: 'Performance',
              onTap: () => context.push('/performance'),
            ),
            _MenuItem(
              icon: Icons.badge_outlined,
              label: 'Employee lookup',
              onTap: () => context.push('/employee-lookup'),
            ),
            _MenuItem(
              icon: Icons.check_circle_outline,
              label: 'Tasks',
              onTap: () => context.push('/tasks'),
            ),
            _MenuItem(
              icon: Icons.business_outlined,
              label: 'Clients',
              onTap: () => context.push('/clients'),
            ),
            _MenuItem(
              icon: Icons.receipt_long_outlined,
              label: 'Invoices',
              onTap: () => context.push('/md-invoices'),
            ),
            _MenuItem(
              icon: Icons.workspace_premium_outlined,
              label: 'Points / Incentives',
              onTap: () => context.push('/md-points'),
            ),
            _MenuItem(
              icon: Icons.pie_chart_outline,
              label: 'Reports',
              onTap: () => context.push('/md-reports'),
            ),
            _MenuItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock / Inventory',
              onTap: () => context.push('/stock'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ] else if (isMgr) ...[
            _SectionLabel(label: 'Manager'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.groups_2_outlined,
              label: 'Team overview',
              onTap: () => context.push('/team'),
            ),
            _MenuItem(
              icon: Icons.business_outlined,
              label: 'Clients',
              onTap: () => context.push('/clients'),
            ),
            _MenuItem(
              icon: Icons.pie_chart_outline,
              label: 'Team reports',
              onTap: () => context.push('/reports'),
            ),
            _MenuItem(
              icon: Icons.receipt_long_outlined,
              label: 'Team orders',
              onTap: () => context.push('/manager-orders'),
            ),
            _MenuItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock / Inventory',
              onTap: () => context.push('/stock'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ] else ...[
            _SectionLabel(label: 'Sales'),
            const SizedBox(height: 6),
            _MenuItem(
              icon: Icons.calendar_today_outlined,
              label: 'Follow-ups',
              onTap: () => context.push('/follow-ups'),
            ),
            _MenuItem(
              icon: Icons.receipt_long_outlined,
              label: 'My Orders',
              onTap: () => context.push('/orders'),
            ),
            _MenuItem(
              icon: Icons.inventory_2_outlined,
              label: 'Stock / Inventory',
              onTap: () => context.push('/stock'),
            ),
            _MenuItem(
              icon: Icons.bar_chart_outlined,
              label: 'Performance',
              onTap: () => context.push('/performance'),
            ),
            _MenuItem(
              icon: Icons.pie_chart_outline,
              label: 'Reports',
              onTap: () => context.push('/sales-reports'),
            ),
            _MenuItem(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              onTap: () => context.push('/assistant'),
            ),
            const SizedBox(height: 12),
          ],

          _SectionLabel(label: 'General'),
          const SizedBox(height: 6),
          _MenuItem(
            icon: Icons.notifications_outlined,
            label: 'Notifications',
            badge: unread > 0 ? '$unread' : null,
            onTap: () => context.push('/notifications'),
          ),
          _MenuItem(
            icon: Icons.person_outline,
            label: 'Profile',
            onTap: () => context.push('/profile'),
          ),
          _MenuItem(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () => context.push('/settings'),
          ),
          const SizedBox(height: 20),
          _MenuItem(
            icon: Icons.logout,
            label: 'Sign Out',
            color: AppColors.error,
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(label,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
              letterSpacing: 0.5)),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? badge;
  final Color? color;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    this.badge,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.onSurface;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 22, color: c),
            const SizedBox(width: 16),
            Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500, color: c)),
            ),
            if (badge != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(badge!,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white)),
              ),
            if (badge == null && color == null)
              Icon(Icons.chevron_right,
                  size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
