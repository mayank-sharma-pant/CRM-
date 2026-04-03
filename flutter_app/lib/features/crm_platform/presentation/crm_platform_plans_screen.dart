import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformPlansScreen extends ConsumerWidget {
  const CrmPlatformPlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformPlansProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plans',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load plans',
          onRetry: () => ref.invalidate(crmPlatformPlansProvider),
        ),
        data: (d) {
          final plans = List<Map<String, dynamic>>.from(d['plans'] ?? []);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(crmPlatformPlansProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: plans.length,
              itemBuilder: (_, i) {
                final p = plans[i];
                final storage = p['max_storage_gb'];
                final storageLabel =
                    storage == null ? 'Unlimited' : '${storage} GB';
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(
                      p['name']?.toString() ?? 'Plan',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      '\$${p['price_monthly'] ?? '-'} / month · '
                      'Users ${p['max_users'] ?? '-'} · '
                      'Teams ${p['max_teams'] ?? '-'} · '
                      'Storage $storageLabel',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                    trailing: (p['is_active'] == true)
                        ? const Icon(Icons.verified, color: Colors.green)
                        : const Icon(Icons.block, color: AppColors.textMuted),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
