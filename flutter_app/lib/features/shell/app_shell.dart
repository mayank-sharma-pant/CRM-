import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/notifications/providers/notifications_provider.dart';

class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const _salesPaths = [
    '/dashboard',
    '/leads',
    '/clients',
    '/tasks',
    '/more',
  ];

  static const _managerPaths = [
    '/dashboard',
    '/team',
    '/leads',
    '/tasks',
    '/more',
  ];

  static const _mdPaths = [
    '/dashboard',
    '/revenue',
    '/leads',
    '/teams',
    '/more',
  ];

  /// Tenant operator (admin, no company) — `/api/platform/*`.
  /// Pending is tab 1 (right after dashboard) so operators start with signups.
  static const _platformCrmPaths = [
    '/dashboard',
    '/platform-pending',
    '/platform-companies',
    '/platform-logs',
    '/more',
  ];

  static const _companyAdminPaths = [
    '/dashboard',
    '/admin-users',
    '/admin-teams',
    '/admin-approvals',
    '/more',
  ];

  static const _purchasePaths = [
    '/dashboard',
    '/purchase-sales',
    '/purchase-invoices',
    '/stock',
    '/more',
  ];

  int _currentIndex(
    String location, {
    required bool platformCrm,
    required bool companyAdmin,
    required bool manager,
    required bool md,
    required bool purchase,
  }) {
    if (platformCrm) {
      if (location.startsWith('/platform-pending')) return 1;
      if (location.startsWith('/platform-companies')) return 2;
      if (location.startsWith('/platform-logs')) return 3;
      if (location.startsWith('/more') ||
          location.startsWith('/settings') ||
          location.startsWith('/profile') ||
          location.startsWith('/notifications') ||
          location.startsWith('/platform-plans') ||
          location.startsWith('/platform-session') ||
          location.startsWith('/assistant')) return 4;
      return 0;
    }
    if (companyAdmin) {
      if (location.startsWith('/admin-users')) return 1;
      if (location.startsWith('/admin-teams')) return 2;
      if (location.startsWith('/admin-approvals')) return 3;
      if (location.startsWith('/more') ||
          location.startsWith('/settings') ||
          location.startsWith('/profile') ||
          location.startsWith('/notifications') ||
          location.startsWith('/clients') ||
          location.startsWith('/stock') ||
          location.startsWith('/assistant') ||
          location.startsWith('/performance') ||
          location.startsWith('/leads') ||
          location.startsWith('/tasks') ||
          location.startsWith('/follow-ups') ||
          location.startsWith('/orders') ||
          location.startsWith('/invoices') ||
          location.startsWith('/admin-hierarchy') ||
          location.startsWith('/admin-audit-log') ||
          location.startsWith('/admin-settings')) return 4;
      return 0;
    }
    if (md) {
      if (location.startsWith('/revenue')) return 1;
      if (location.startsWith('/leads')) return 2;
      if (location.startsWith('/teams')) return 3;
      if (location.startsWith('/more') ||
          location.startsWith('/settings') ||
          location.startsWith('/profile') ||
          location.startsWith('/notifications') ||
          location.startsWith('/clients') ||
          location.startsWith('/stock') ||
          location.startsWith('/assistant') ||
          location.startsWith('/performance') ||
          location.startsWith('/employee-lookup') ||
          location.startsWith('/md-invoices') ||
          location.startsWith('/tasks') ||
          location.startsWith('/follow-ups') ||
          location.startsWith('/orders') ||
          location.startsWith('/invoices')) return 4;
      return 0;
    }
    if (manager) {
      if (location.startsWith('/team')) return 1;
      if (location.startsWith('/leads')) return 2;
      if (location.startsWith('/tasks')) return 3;
      if (location.startsWith('/more') ||
          location.startsWith('/settings') ||
          location.startsWith('/profile') ||
          location.startsWith('/notifications') ||
          location.startsWith('/stock') ||
          location.startsWith('/assistant') ||
          location.startsWith('/reports') ||
          location.startsWith('/manager-orders') ||
          location.startsWith('/clients') ||
          location.startsWith('/invoices') ||
          location.startsWith('/orders')) return 4;
      return 0;
    }
    if (purchase) {
      if (location.startsWith('/purchase-sales')) return 1;
      if (location.startsWith('/purchase-invoices') ||
          location.startsWith('/purchase-invoice')) return 2;
      if (location.startsWith('/stock')) return 3;
      if (location.startsWith('/more') ||
          location.startsWith('/settings') ||
          location.startsWith('/profile') ||
          location.startsWith('/notifications') ||
          location.startsWith('/assistant') ||
          location.startsWith('/clients') ||
          location.startsWith('/purchase-monitoring') ||
          location.startsWith('/invoices')) return 4;
      return 0;
    }
    if (location.startsWith('/leads')) return 1;
    if (location.startsWith('/clients')) return 2;
    if (location.startsWith('/tasks')) return 3;
    if (location.startsWith('/more') ||
        location.startsWith('/settings') ||
        location.startsWith('/profile') ||
        location.startsWith('/notifications') ||
        location.startsWith('/stock') ||
        location.startsWith('/invoices') ||
        location.startsWith('/orders') ||
        location.startsWith('/assistant') ||
        location.startsWith('/follow-ups') ||
        location.startsWith('/performance') ||
        location.startsWith('/sales-reports')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final user = ref.watch(authProvider).user;
    final platformCrm = user?.isPlatformAdmin ?? false;
    final companyAdmin = user?.isCompanyAdmin ?? false;
    final md = !platformCrm && !companyAdmin && user?.isMD == true;
    final manager =
        !platformCrm && !companyAdmin && !md && user?.isManager == true;
    final purchase = !platformCrm &&
        !companyAdmin &&
        !md &&
        !manager &&
        user?.isPurchase == true;

    final paths = platformCrm
        ? _platformCrmPaths
        : (companyAdmin
            ? _companyAdminPaths
            : (md
                ? _mdPaths
                : (manager
                    ? _managerPaths
                    : (purchase ? _purchasePaths : _salesPaths))));

    final currentIdx = _currentIndex(
      location,
      platformCrm: platformCrm,
      companyAdmin: companyAdmin,
      manager: manager,
      md: md,
      purchase: purchase,
    );
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    ref.listen<AuthState>(authProvider, (_, next) {
      if (next.status == AuthStatus.unauthenticated) {
        context.go('/login');
      }
    });

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIdx,
        onDestinationSelected: (idx) => context.go(paths[idx]),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(platformCrm
                ? Icons.pending_actions_outlined
                : purchase
                    ? Icons.fact_check_outlined
                    : companyAdmin
                        ? Icons.people_outline
                        : md
                            ? Icons.payments_outlined
                            : manager
                                ? Icons.groups_outlined
                                : Icons.people_outline),
            selectedIcon: Icon(platformCrm
                ? Icons.pending_actions
                : purchase
                    ? Icons.fact_check
                    : companyAdmin
                        ? Icons.people
                        : md
                            ? Icons.payments
                            : manager
                                ? Icons.groups
                                : Icons.people),
            label: platformCrm
                ? 'Pending'
                : purchase
                    ? 'Approvals'
                    : companyAdmin
                        ? 'Staff'
                        : md
                            ? 'Revenue'
                            : manager
                                ? 'Team'
                                : 'Leads',
          ),
          NavigationDestination(
            icon: Icon(platformCrm
                ? Icons.business_outlined
                : purchase
                    ? Icons.receipt_long_outlined
                    : companyAdmin
                        ? Icons.groups_outlined
                        : md
                            ? Icons.people_outline
                            : manager
                                ? Icons.people_outline
                                : Icons.business_outlined),
            selectedIcon: Icon(platformCrm
                ? Icons.business
                : purchase
                    ? Icons.receipt_long
                    : companyAdmin
                        ? Icons.groups
                        : md
                            ? Icons.people
                            : manager
                                ? Icons.people
                                : Icons.business),
            label: platformCrm
                ? 'Companies'
                : purchase
                    ? 'Invoices'
                    : companyAdmin
                        ? 'Teams'
                        : md
                            ? 'Leads'
                            : manager
                                ? 'Leads'
                                : 'Clients',
          ),
          NavigationDestination(
            icon: Icon(platformCrm
                ? Icons.list_alt_outlined
                : purchase
                    ? Icons.inventory_2_outlined
                    : companyAdmin
                        ? Icons.how_to_reg_outlined
                        : md
                            ? Icons.groups_outlined
                            : Icons.check_circle_outline),
            selectedIcon: Icon(platformCrm
                ? Icons.list_alt
                : purchase
                    ? Icons.inventory_2
                    : companyAdmin
                        ? Icons.how_to_reg
                        : md
                            ? Icons.groups
                            : Icons.check_circle),
            label: platformCrm
                ? 'Logs'
                : purchase
                    ? 'Stock'
                    : companyAdmin
                        ? 'Approvals'
                        : md
                            ? 'Teams'
                            : 'Tasks',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread',
                  style: const TextStyle(fontSize: 9, color: Colors.white)),
              backgroundColor: AppColors.error,
              child: const Icon(Icons.more_horiz),
            ),
            selectedIcon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread',
                  style: const TextStyle(fontSize: 9, color: Colors.white)),
              backgroundColor: AppColors.error,
              child: const Icon(Icons.more_horiz),
            ),
            label: 'More',
          ),
        ],
      ),
    );
  }
}
