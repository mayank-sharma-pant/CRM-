import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

/// Backend allows `purchase`, `md`, `admin` for `/api/purchase/*`.
class PurchaseAccess {
  PurchaseAccess._();

  static bool allowed(String? role) {
    if (role == null) return false;
    return role == 'purchase' || role == 'md' || role == 'admin';
  }
}

class PurchaseGate extends ConsumerWidget {
  final Widget child;

  const PurchaseGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).user?.role;
    if (PurchaseAccess.allowed(role)) return child;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Purchase department access required.'),
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
