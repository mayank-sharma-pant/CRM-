import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/dashboard/presentation/dashboard_screen.dart';
import 'package:perioxia_crm/features/manager/presentation/manager_dashboard_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_dashboard_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_dashboard_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_dashboard_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_dashboard_screen.dart';

/// Picks dashboard by role (sales, manager, MD, admin, purchase).
class DashboardEntry extends ConsumerWidget {
  const DashboardEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    if (user?.isPlatformAdmin ?? false) {
      return const CrmPlatformDashboardScreen();
    }
    final role = user?.role;
    if (role == 'admin') {
      return const AdminDashboardScreen();
    }
    if (role == 'manager') {
      return const ManagerDashboardScreen();
    }
    if (role == 'md') {
      return const MdDashboardScreen();
    }
    if (role == 'purchase') {
      return const PurchaseDashboardScreen();
    }
    return const DashboardScreen();
  }
}
