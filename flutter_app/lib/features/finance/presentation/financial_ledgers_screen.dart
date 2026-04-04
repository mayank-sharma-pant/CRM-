import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final _ledgersIndexProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get(ApiEndpoints.ledgers);
  final raw = r.data;
  if (raw is! List) return [];
  return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

String _ledgersLoadMessage(Object e) {
  if (e is DioException) {
    final code = e.response?.statusCode;
    if (code == 403) {
      return 'You do not have permission to view financial ledgers.';
    }
    if (code == 401) {
      return 'Session expired. Sign in again.';
    }
    final d = e.response?.data;
    if (d is Map && d['detail'] != null) {
      final det = d['detail'];
      if (det is List) {
        return det.map((x) => x.toString()).join(', ');
      }
      return det.toString();
    }
  }
  return 'Failed to load ledgers';
}

class FinancialLedgersScreen extends ConsumerWidget {
  const FinancialLedgersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_ledgersIndexProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Financial ledgers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: async.isLoading
                ? null
                : () => ref.invalidate(_ledgersIndexProvider),
          ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: _ledgersLoadMessage(e),
          onRetry: () => ref.invalidate(_ledgersIndexProvider),
        ),
        data: (list) {
          if (list.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.5,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No ledgers available for your role.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                ),
              ],
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(_ledgersIndexProvider);
              await ref.read(_ledgersIndexProvider.future);
            },
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              itemBuilder: (_, i) {
                final m = list[i];
                final slug = m['slug']?.toString() ?? '';
                final name = m['name']?.toString() ?? slug;
                final canEdit = m['can_edit'] == true;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(name),
                    subtitle: Text(canEdit ? 'View & edit' : 'View only'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: slug.isEmpty
                        ? null
                        : () => context.push('/finance-ledgers/$slug'),
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
