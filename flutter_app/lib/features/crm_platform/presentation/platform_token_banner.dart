import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/platform_token_exchange_dialog.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';

/// Shown when the platform JWT is missing (e.g. OTP sign-in).
class PlatformTokenMissingBanner extends ConsumerWidget {
  const PlatformTokenMissingBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokenAsync = ref.watch(platformTokenPresentProvider);
    return tokenAsync.when(
      data: (hasToken) {
        if (hasToken) return const SizedBox.shrink();
        return MaterialBanner(
          content: const Text(
            'Platform API token missing. Enter your password here, or sign out and sign in with your password.',
          ),
          actions: [
            TextButton(
              onPressed: () => showPlatformTokenExchangeDialog(context),
              child: const Text('Enter password'),
            ),
            TextButton(
              onPressed: () => context.go('/login'),
              child: const Text('Sign in'),
            ),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
