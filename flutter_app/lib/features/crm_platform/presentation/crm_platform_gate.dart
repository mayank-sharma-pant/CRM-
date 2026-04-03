import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

/// CRM / tenant operator — `admin` with no company (not company admin).
class CrmPlatformGate extends ConsumerWidget {
  final Widget child;

  const CrmPlatformGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final u = ref.watch(authProvider).user;
    if (u != null && u.isPlatformAdmin) return child;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('CRM platform tools are for tenant operators only.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/dashboard'),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
