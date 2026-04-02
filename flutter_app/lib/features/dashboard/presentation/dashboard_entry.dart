import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/dashboard/presentation/dashboard_screen.dart';
import 'package:perioxia_crm/features/manager/presentation/manager_dashboard_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_dashboard_screen.dart';

/// Picks sales vs manager vs MD dashboard based on role.
class DashboardEntry extends ConsumerWidget {
  const DashboardEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (role == 'manager') {
      return const ManagerDashboardScreen();
    }
    if (role == 'md' || role == 'admin') {
      return const MdDashboardScreen();
    }
    return const DashboardScreen();
  }
}
