import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/clients/presentation/clients_list_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_clients_list_screen.dart';

/// Sales/manager: standard clients API. MD/admin: company-wide MD clients API.
class ClientsEntry extends ConsumerWidget {
  const ClientsEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (role == 'md' || role == 'admin') {
      return const MdClientsListScreen();
    }
    return const ClientsListScreen();
  }
}
