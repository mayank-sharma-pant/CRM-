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

  bool _isMd(String? role) => role == 'md' || role == 'admin';

  bool _isManager(String? role) => role == 'manager';

  int _currentIndex(String location, {required bool manager, required bool md}) {
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
        location.startsWith('/performance')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final role = ref.watch(authProvider).user?.role;
    final md = _isMd(role);
    final manager = !md && _isManager(role);
    final paths = md ? _mdPaths : (manager ? _managerPaths : _salesPaths);
    final currentIdx = _currentIndex(location, manager: manager, md: md);
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
            icon: Icon(md
                ? Icons.payments_outlined
                : manager
                    ? Icons.groups_outlined
                    : Icons.people_outline),
            selectedIcon: Icon(md
                ? Icons.payments
                : manager
                    ? Icons.groups
                    : Icons.people),
            label: md
                ? 'Revenue'
                : manager
                    ? 'Team'
                    : 'Leads',
          ),
          NavigationDestination(
            icon: Icon(md
                ? Icons.people_outline
                : manager
                    ? Icons.people_outline
                    : Icons.business_outlined),
            selectedIcon: Icon(md
                ? Icons.people
                : manager
                    ? Icons.people
                    : Icons.business),
            label: md
                ? 'Leads'
                : manager
                    ? 'Leads'
                    : 'Clients',
          ),
          NavigationDestination(
            icon: Icon(md
                ? Icons.groups_outlined
                : Icons.check_circle_outline),
            selectedIcon:
                Icon(md ? Icons.groups : Icons.check_circle),
            label: md ? 'Teams' : 'Tasks',
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
