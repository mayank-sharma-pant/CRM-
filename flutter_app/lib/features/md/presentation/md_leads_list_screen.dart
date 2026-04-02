import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/md_repository.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/status_badge.dart';

final _mdLeadsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(mdRepositoryProvider).getLeads(limit: 200);
});

class MdLeadsListScreen extends ConsumerStatefulWidget {
  const MdLeadsListScreen({super.key});

  @override
  ConsumerState<MdLeadsListScreen> createState() => _MdLeadsListScreenState();
}

class _MdLeadsListScreenState extends ConsumerState<MdLeadsListScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_mdLeadsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company Leads',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search name, company, owner…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load leads',
                onRetry: () => ref.invalidate(_mdLeadsProvider),
              ),
              data: (d) {
                final raw =
                    List<Map<String, dynamic>>.from(d['leads'] ?? []);
                final filtered = _search.isEmpty
                    ? raw
                    : raw.where((l) {
                        final blob =
                            '${l['name']} ${l['company']} ${l['owner']} ${l['team']} ${l['status']}'
                                .toLowerCase();
                        return blob.contains(_search);
                      }).toList();

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_mdLeadsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final l = filtered[i];
                      final id = l['id'] as int;
                      return Material(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => context.push('/leads/$id'),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        l['name']?.toString() ?? '—',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15),
                                      ),
                                    ),
                                    StatusBadge(label: l['status']?.toString() ?? ''),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  l['company']?.toString() ?? '',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${l['team']} · ${l['owner']}',
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.textMuted),
                                ),
                              ],
                            ),
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
