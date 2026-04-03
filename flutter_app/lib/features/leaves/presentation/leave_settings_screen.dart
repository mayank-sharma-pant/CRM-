import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final _leavesProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get(ApiEndpoints.leaves);
  return Map<String, dynamic>.from(r.data as Map);
});

class LeaveSettingsScreen extends ConsumerWidget {
  const LeaveSettingsScreen({super.key});

  bool _canApprove(String? role) {
    return role == 'manager' || role == 'admin' || role == 'md';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final async = ref.watch(_leavesProvider);
    final approve = _canApprove(user?.role);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Leave requests'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: user?.companyId == null
            ? null
            : () => _openRequestSheet(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Request leave'),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load leaves',
          onRetry: () => ref.invalidate(_leavesProvider),
        ),
        data: (data) {
          final items =
              List<Map<String, dynamic>>.from(data['items'] ?? []);
          if (items.isEmpty) {
            return Center(
              child: Text('No leave requests yet',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_leavesProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final it = items[i];
                final id = it['id'] as int;
                final status = it['status']?.toString() ?? '';
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                it['user_name']?.toString() ?? '—',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: status == 'Approved'
                                    ? AppColors.success.withOpacity(0.12)
                                    : status == 'Rejected'
                                        ? AppColors.error.withOpacity(0.12)
                                        : AppColors.warning.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: status == 'Approved'
                                      ? AppColors.success
                                      : status == 'Rejected'
                                          ? AppColors.error
                                          : AppColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${it['from_date'] ?? '—'} → ${it['to_date'] ?? '—'}',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textSecondary),
                        ),
                        if ((it['reason'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(it['reason'].toString(),
                              style: const TextStyle(fontSize: 13)),
                        ],
                        if (approve && status == 'Pending') ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              TextButton(
                                onPressed: () => _approve(
                                    context, ref, id, 'Approved'),
                                child: const Text('Approve'),
                              ),
                              TextButton(
                                onPressed: () => _approve(
                                    context, ref, id, 'Rejected'),
                                child: Text('Reject',
                                    style: TextStyle(color: AppColors.error)),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _approve(
      BuildContext context, WidgetRef ref, int id, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        ApiEndpoints.leaveApprove(id),
        data: {'status': status},
      );
      ref.invalidate(_leavesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Marked as $status')),
        );
      }
    } on DioException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text(ApiException.fromDioError(e).message)),
        );
      }
    }
  }

  Future<void> _openRequestSheet(BuildContext context, WidgetRef ref) async {
    final reasonCtrl = TextEditingController();
    final now = DateTime.now();
    DateTimeRange? range = DateTimeRange(
      start: now,
      end: now.add(const Duration(days: 1)),
    );

    final result = await showModalBottomSheet<Map<String, dynamic>?>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: StatefulBuilder(
            builder: (ctx, setSt) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('New leave request',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  ListTile(
                    title: Text(
                      '${DateFormat.yMMMd().format(range!.start)} – ${DateFormat.yMMMd().format(range!.end)}',
                    ),
                    trailing: const Icon(Icons.date_range),
                    onTap: () async {
                      final r = await showDateRangePicker(
                        context: ctx,
                        firstDate: DateTime(now.year - 1),
                        lastDate: DateTime(now.year + 2),
                        initialDateRange: range,
                      );
                      if (r != null) setSt(() => range = r);
                    },
                  ),
                  TextField(
                    controller: reasonCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Reason (optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, {
                      'range': range,
                      'reason': reasonCtrl.text.trim(),
                    }),
                    child: const Text('Submit'),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
    reasonCtrl.dispose();
    if (result == null) return;
    final picked = result['range'] as DateTimeRange?;
    if (picked == null) return;
    final reasonStr = result['reason'] as String? ?? '';

    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        ApiEndpoints.leaves,
        data: {
          'from_date': picked.start.toUtc().toIso8601String(),
          'to_date': picked.end.toUtc().toIso8601String(),
          if (reasonStr.isNotEmpty) 'reason': reasonStr,
        },
      );
      ref.invalidate(_leavesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted')),
        );
      }
    } on DioException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text(ApiException.fromDioError(e).message)),
        );
      }
    }
  }
}
