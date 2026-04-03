import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/crm_platform_repository.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformCompanyDetailScreen extends ConsumerWidget {
  final int companyId;

  const CrmPlatformCompanyDetailScreen({super.key, required this.companyId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crmPlatformCompanyDetailProvider(companyId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load',
          onRetry: () =>
              ref.invalidate(crmPlatformCompanyDetailProvider(companyId)),
        ),
        data: (d) {
          final stats = Map<String, dynamic>.from(d['statistics'] ?? {});
          final st = d['status']?.toString() ?? '';
          final createdAt =
              (d['created_at']?.toString().split('T').first) ?? '—';
          final approvedAt =
              (d['approved_at']?.toString().split('T').first) ?? '';
          final planLabel = _planNameForId(d['plan_id']);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(d['name']?.toString() ?? '',
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w800)),
              Text('Status: $st',
                  style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              if (planLabel.isNotEmpty)
                _R('Plan', planLabel),
              _R('Created', createdAt),
              if (approvedAt.isNotEmpty) _R('Approved', approvedAt),
              const Divider(height: 24),
              _R('Users', '${stats['users'] ?? '—'}'),
              _R('Leads', '${stats['leads'] ?? '—'}'),
              _R('Clients', '${stats['clients'] ?? '—'}'),
              _R('Tasks', '${stats['tasks'] ?? '—'}'),
              const SizedBox(height: 20),
              if (st == 'pending') ...[
                FilledButton(
                  onPressed: () async {
                    await ref
                        .read(crmPlatformRepositoryProvider)
                        .approveCompany(companyId);
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformPendingProvider);
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    ref.invalidate(crmPlatformMetricsProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Approved')));
                      context.pop();
                    }
                  },
                  child: const Text('Approve company'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () async {
                    final reason = await showDialog<String?>(
                      context: context,
                      builder: (ctx) {
                        final t = TextEditingController();
                        return AlertDialog(
                          title: const Text('Reject company'),
                          content: TextField(
                            controller: t,
                            decoration: const InputDecoration(
                              hintText: 'Reason (optional)',
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              onPressed: () =>
                                  Navigator.pop(ctx, t.text.trim()),
                              child: const Text('Reject'),
                            ),
                          ],
                        );
                      },
                    );
                    if (!context.mounted) return;
                    if (reason == null) return;

                    await ref.read(crmPlatformRepositoryProvider).rejectCompany(
                          companyId,
                          reason: reason.isEmpty ? null : reason,
                        );
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformPendingProvider);
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    ref.invalidate(crmPlatformMetricsProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Rejected')));
                      context.pop();
                    }
                  },
                  child: const Text('Reject'),
                ),
              ],
              if (st == 'active') ...[
                OutlinedButton(
                  onPressed: () async {
                    await ref.read(crmPlatformRepositoryProvider).updateCompanyStatus(
                        companyId, 'suspended');
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Suspended')));
                    }
                  },
                  child: const Text('Suspend'),
                ),
              ],
              if (st == 'suspended')
                FilledButton(
                  onPressed: () async {
                    await ref
                        .read(crmPlatformRepositoryProvider)
                        .updateCompanyStatus(companyId, 'active');
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reactivated')));
                    }
                  },
                  child: const Text('Set active'),
                ),
              if (st == 'rejected') ...[
                OutlinedButton(
                  onPressed: () async {
                    await ref.read(crmPlatformRepositoryProvider).updateCompanyStatus(
                        companyId, 'pending');
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformPendingProvider);
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    ref.invalidate(crmPlatformMetricsProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Moved back to pending review')));
                    }
                  },
                  child: const Text('Reopen as pending'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () async {
                    await ref.read(crmPlatformRepositoryProvider).updateCompanyStatus(
                        companyId, 'active');
                    ref.invalidate(crmPlatformCompanyDetailProvider(companyId));
                    ref.invalidate(crmPlatformPendingProvider);
                    ref.invalidate(crmPlatformCompaniesProvider(null));
                    ref.invalidate(crmPlatformMetricsProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Activated')));
                    }
                  },
                  child: const Text('Activate anyway'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

String _planNameForId(dynamic planIdRaw) {
  final planId =
      planIdRaw is int ? planIdRaw : int.tryParse(planIdRaw?.toString() ?? '');
  switch (planId) {
    case 1:
      return 'Starter';
    case 2:
      return 'Growth';
    case 3:
      return 'Enterprise';
    default:
      return planId == null ? '' : 'Plan $planId';
  }
}

class _R extends StatelessWidget {
  final String k;
  final String v;

  const _R(this.k, this.v);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: const TextStyle(color: AppColors.textMuted)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
