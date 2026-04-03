import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/md/presentation/md_performance_screen.dart';
import 'package:perioxia_crm/features/performance/presentation/performance_screen.dart';

class PerformanceEntry extends ConsumerWidget {
  const PerformanceEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (role == 'md') {
      return const MdPerformanceScreen();
    }
    return const PerformanceScreen();
  }
}
