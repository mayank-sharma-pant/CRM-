import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/crm_platform_repository.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/platform_token_banner.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformPendingScreen extends ConsumerWidget {
  const CrmPlatformPendingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformPendingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending tenants',
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
                message: 'Failed to load',
                onRetry: () => ref.invalidate(crmPlatformPendingProvider),
              ),
              data: (d) {
                final list =
                    List<Map<String, dynamic>>.from(d['companies'] ?? []);
                if (list.isEmpty) {
                  return const Center(
                      child: Text('No pending companies',
                          style: TextStyle(color: AppColors.textMuted)));
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(crmPlatformPendingProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final c = list[i];
                      final id = c['id'] as int;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['name']?.toString() ?? '',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16)),
                              Text('Requested: ${c['requested_at'] ?? '—'}',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textMuted)),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  FilledButton(
                                    onPressed: () async {
                                      await ref
                                          .read(crmPlatformRepositoryProvider)
                                          .approveCompany(id);
                                      ref.invalidate(
                                          crmPlatformPendingProvider);
                                      ref.invalidate(
                                          crmPlatformCompaniesProvider(null));
                                      ref.invalidate(
                                          crmPlatformMetricsProvider);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                                content: Text('Approved')));
                                      }
                                    },
                                    child: const Text('Approve'),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton(
                                    onPressed: () async {
                                      final reason =
                                          await showDialog<String?>(
                                        context: context,
                                        builder: (ctx) {
                                          final t = TextEditingController();
                                          return AlertDialog(
                                            title: const Text('Reject'),
                                            content: TextField(
                                              controller: t,
                                              decoration:
                                                  const InputDecoration(
                                                      hintText:
                                                          'Reason (optional)'),
                                            ),
                                            actions: [
                                              TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(ctx),
                                                  child: const Text(
                                                      'Cancel')),
                                              FilledButton(
                                                  onPressed: () =>
                                                      Navigator.pop(
                                                          ctx, t.text.trim()),
                                                  child:
                                                      const Text('Reject')),
                                            ],
                                          );
                                        },
                                      );
                                      if (!context.mounted) return;
                                      if (reason == null) return;

                                      await ref
                                          .read(crmPlatformRepositoryProvider)
                                          .rejectCompany(id,
                                              reason: reason.isEmpty
                                                  ? null
                                                  : reason);
                                      ref.invalidate(
                                          crmPlatformPendingProvider);
                                      ref.invalidate(
                                          crmPlatformCompaniesProvider(null));
                                      ref.invalidate(
                                          crmPlatformMetricsProvider);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                                content: Text('Rejected')));
                                      }
                                    },
                                    child: const Text('Reject'),
                                  ),
                                  TextButton(
                                    onPressed: () => context
                                        .push('/platform-companies/$id'),
                                    child: const Text('Details'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
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
