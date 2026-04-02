import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/leads/presentation/leads_list_screen.dart';
import 'package:perioxia_crm/features/manager/presentation/manager_leads_list_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_leads_list_screen.dart';

/// Team-scoped leads for managers; company list for MD; personal/sales for sales.
class LeadsEntry extends ConsumerWidget {
  const LeadsEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (role == 'manager') {
      return const ManagerLeadsListScreen();
    }
    if (role == 'md' || role == 'admin') {
      return const MdLeadsListScreen();
    }
    return const LeadsListScreen();
  }
}
