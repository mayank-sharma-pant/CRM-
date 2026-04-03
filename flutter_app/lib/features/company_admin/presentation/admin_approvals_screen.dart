import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminApprovalsScreen extends ConsumerStatefulWidget {
  const AdminApprovalsScreen({super.key});

  @override
  ConsumerState<AdminApprovalsScreen> createState() =>
      _AdminApprovalsScreenState();
}

class _AdminApprovalsScreenState extends ConsumerState<AdminApprovalsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  String _dynStr(dynamic v) {
    if (v == null) return '';
    if (v is Map && v['value'] != null) return v['value'].toString();
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    final appr = ref.watch(companyAdminApprovalsProvider);
    final xfer = ref.watch(companyAdminTransfersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Approvals',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Signups'),
            Tab(text: 'Transfers'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          appr.when(
            loading: () => const LoadingIndicator(),
            error: (e, _) => ErrorBanner(
              message: 'Failed to load approvals',
              onRetry: () => ref.invalidate(companyAdminApprovalsProvider),
            ),
            data: (d) {
              final list =
                  List<Map<String, dynamic>>.from(d['approvals'] ?? []);
              if (list.isEmpty) {
                return const Center(
                    child: Text('No pending signups',
                        style: TextStyle(color: AppColors.textMuted)));
              }
              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(companyAdminApprovalsProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final a = list[i];
                    final id = a['id'] as int;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a['name']?.toString() ?? '',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700)),
                            Text(a['email']?.toString() ?? '',
                                style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary)),
                            Text(
                                'Role: ${_dynStr(a['role'])} · ${a['requested_at'] ?? ''}',
                                style: const TextStyle(
                                    fontSize: 12, color: AppColors.textMuted)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                FilledButton(
                                  onPressed: () async {
                                    await ref
                                        .read(companyAdminRepositoryProvider)
                                        .approveUserSignup(id);
                                    ref.invalidate(
                                        companyAdminApprovalsProvider);
                                    ref.invalidate(companyAdminUsersProvider);
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
                                    await ref
                                        .read(companyAdminRepositoryProvider)
                                        .rejectUserSignup(id);
                                    ref.invalidate(
                                        companyAdminApprovalsProvider);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(const SnackBar(
                                              content: Text('Rejected')));
                                    }
                                  },
                                  child: const Text('Reject'),
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
          xfer.when(
            loading: () => const LoadingIndicator(),
            error: (e, _) => ErrorBanner(
              message: 'Failed to load transfers',
              onRetry: () => ref.invalidate(companyAdminTransfersProvider),
            ),
            data: (d) {
              final raw = d['requests'];
              final list = <Map<String, dynamic>>[];
              if (raw is List) {
                for (final x in raw) {
                  if (x is Map<String, dynamic>) {
                    list.add(x);
                  } else if (x is Map) {
                    list.add(Map<String, dynamic>.from(x));
                  }
                }
              }
              if (list.isEmpty) {
                return const Center(
                    child: Text('No pending transfers',
                        style: TextStyle(color: AppColors.textMuted)));
              }
              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(companyAdminTransfersProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final r = list[i];
                    final id = r['id'] as int?;
                    if (id == null) return const SizedBox.shrink();
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Request #$id',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700)),
                            Text(
                                'User ${r['user_id']} → team ${r['target_team_id']}',
                                style: const TextStyle(fontSize: 13)),
                            if (r['reason'] != null)
                              Text(r['reason'].toString(),
                                  style: const TextStyle(fontSize: 12)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                FilledButton(
                                  onPressed: () async {
                                    await ref
                                        .read(companyAdminRepositoryProvider)
                                        .approveTransfer(id);
                                    ref.invalidate(
                                        companyAdminTransfersProvider);
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
                                    await ref
                                        .read(companyAdminRepositoryProvider)
                                        .rejectTransfer(id);
                                    ref.invalidate(
                                        companyAdminTransfersProvider);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(const SnackBar(
                                              content: Text('Rejected')));
                                    }
                                  },
                                  child: const Text('Reject'),
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
        ],
      ),
    );
  }
}
