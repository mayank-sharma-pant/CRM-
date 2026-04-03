import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/platform_token_banner.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Operator identity as validated by `GET /api/platform/auth/me` (platform JWT).
class CrmPlatformSessionScreen extends ConsumerWidget {
  const CrmPlatformSessionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformAuthMeProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform session',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const PlatformTokenMissingBanner(),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message:
                    'Could not verify platform session. Check token and try again.',
                onRetry: () => ref.invalidate(crmPlatformAuthMeProvider),
              ),
              data: (d) {
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(crmPlatformAuthMeProvider);
                    ref.invalidate(platformTokenPresentProvider);
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        d['full_name']?.toString() ?? '—',
                        style: const TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        d['email']?.toString() ?? '—',
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 20),
                      _Row(label: 'User ID', value: '${d['id'] ?? '—'}'),
                      _Row(
                          label: 'Role',
                          value: (d['role']?.toString() ?? '—').toUpperCase()),
                      const SizedBox(height: 16),
                      Text(
                        'This is the account recognized by the platform API (Bearer token). It should match your CRM login when you use password sign-in.',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textMuted, height: 1.4),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;

  const _Row({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: const TextStyle(
                    color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
