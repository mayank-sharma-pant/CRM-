import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class CrmPlatformCompaniesScreen extends ConsumerStatefulWidget {
  const CrmPlatformCompaniesScreen({super.key});

  @override
  ConsumerState<CrmPlatformCompaniesScreen> createState() =>
      _CrmPlatformCompaniesScreenState();
}

class _CrmPlatformCompaniesScreenState
    extends ConsumerState<CrmPlatformCompaniesScreen> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(crmPlatformCompaniesProvider(_status));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Companies',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                _statusFilterChip('All', null),
                _statusFilterChip('Active', 'active'),
                _statusFilterChip('Pending', 'pending'),
                _statusFilterChip('Suspended', 'suspended'),
                _statusFilterChip('Rejected', 'rejected'),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load companies',
                onRetry: () =>
                    ref.invalidate(crmPlatformCompaniesProvider(_status)),
              ),
              data: (d) {
                final list =
                    List<Map<String, dynamic>>.from(d['companies'] ?? []);
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(
                      crmPlatformCompaniesProvider(_status)),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final c = list[i];
                      final id = c['id'] as int;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(c['name']?.toString() ?? '—'),
                          subtitle: Text(
                              'Status: ${c['status']} · Users: ${c['user_count'] ?? 0}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/platform-companies/$id'),
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

  Widget _statusFilterChip(String label, String? st) {
    final sel = _status == st;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: sel,
        onSelected: (_) => setState(() => _status = st),
      ),
    );
  }
}
