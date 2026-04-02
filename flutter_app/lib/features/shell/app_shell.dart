import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const _navItems = [
    _NavItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Dashboard', path: '/dashboard'),
    _NavItem(icon: Icons.people_outline, activeIcon: Icons.people, label: 'Leads', path: '/leads'),
    _NavItem(icon: Icons.business_outlined, activeIcon: Icons.business, label: 'Clients', path: '/clients'),
    _NavItem(icon: Icons.check_circle_outline, activeIcon: Icons.check_circle, label: 'Tasks', path: '/tasks'),
    _NavItem(icon: Icons.more_horiz, activeIcon: Icons.more_horiz, label: 'More', path: '/settings'),
  ];

  int _currentIndex(String location) {
    if (location.startsWith('/leads')) return 1;
    if (location.startsWith('/clients')) return 2;
    if (location.startsWith('/tasks')) return 3;
    if (location.startsWith('/settings') ||
        location.startsWith('/profile') ||
        location.startsWith('/notifications') ||
        location.startsWith('/stock') ||
        location.startsWith('/invoices') ||
        location.startsWith('/assistant')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final currentIdx = _currentIndex(location);

    ref.listen<AuthState>(authProvider, (_, next) {
      if (next.status == AuthStatus.unauthenticated) {
        context.go('/login');
      }
    });

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIdx,
        onDestinationSelected: (idx) {
          context.go(_navItems[idx].path);
        },
        destinations: _navItems
            .map((item) => NavigationDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.activeIcon),
                  label: item.label,
                ))
            .toList(),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String path;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.path,
  });
}
