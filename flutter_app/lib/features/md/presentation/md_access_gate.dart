import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

/// Routes only available to Managing Director (or company admin).
class MdAccess {
  MdAccess._();

  static bool allowed(String? role) =>
      role == 'md' || role == 'admin';
}

class MdGate extends ConsumerWidget {
  final Widget child;

  const MdGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (MdAccess.allowed(role)) return child;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('This area is for Managing Director access.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/dashboard'),
                child: const Text('Back to dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
