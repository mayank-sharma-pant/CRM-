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
  String _search = '';

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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Search companies',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v.trim()),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
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
                final rawList =
                    List<Map<String, dynamic>>.from(d['companies'] ?? []);
                final list = rawList.where((c) {
                  if (_search.isEmpty) return true;
                  final name = (c['name'] ?? '').toString().toLowerCase();
                  return name.contains(_search.toLowerCase());
                }).toList();
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(
                      crmPlatformCompaniesProvider(_status)),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final c = list[i];
                      final id = c['id'] as int;
                      final createdAt =
                          (c['created_at']?.toString().split('T').first) ??
                              '—';
                      final planLabel = _planNameForId(c['plan_id']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(c['name']?.toString() ?? '—'),
                          subtitle: Text(
                            'Status: ${c['status']} · '
                            'Plan: $planLabel · '
                            'Users: ${c['user_count'] ?? 0} · '
                            'Created: $createdAt',
                          ),
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

  String _planNameForId(dynamic planIdRaw) {
    final planId = planIdRaw is int
        ? planIdRaw
        : int.tryParse(planIdRaw?.toString() ?? '');
    switch (planId) {
      case 1:
        return 'Starter';
      case 2:
        return 'Growth';
      case 3:
        return 'Enterprise';
      default:
        return planId == null ? '—' : 'Plan $planId';
    }
  }
}
