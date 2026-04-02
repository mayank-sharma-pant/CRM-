import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

class MdClientsListScreen extends ConsumerStatefulWidget {
  const MdClientsListScreen({super.key});

  @override
  ConsumerState<MdClientsListScreen> createState() =>
      _MdClientsListScreenState();
}

class _MdClientsListScreenState extends ConsumerState<MdClientsListScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mdClientsDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company Clients',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search clients…',
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
                message: 'Failed to load clients',
                onRetry: () => ref.invalidate(mdClientsDataProvider),
              ),
              data: (d) {
                final summary = d['summary'] as Map<String, dynamic>? ?? {};
                final raw =
                    List<Map<String, dynamic>>.from(d['clients'] ?? []);
                final filtered = _search.isEmpty
                    ? raw
                    : raw.where((c) {
                        final blob =
                            '${c['name']} ${c['company']}'.toLowerCase();
                        return blob.contains(_search);
                      }).toList();

                if (filtered.isEmpty) {
                  return const EmptyState(
                    icon: Icons.business_outlined,
                    title: 'No clients found',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(mdClientsDataProvider),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (summary.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Total: ${summary['total'] ?? filtered.length}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ...filtered.map((c) {
                        final id = c['id'] as int;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => context.push('/clients/$id'),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor:
                                          AppColors.primary.withOpacity(0.1),
                                      child: Text(
                                        (c['name']?.toString() ?? '?')[0]
                                            .toUpperCase(),
                                        style: const TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            c['name']?.toString() ?? '—',
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w700),
                                          ),
                                          if ((c['company'] ?? '')
                                              .toString()
                                              .isNotEmpty)
                                            Text(
                                              c['company'].toString(),
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color:
                                                      AppColors.textSecondary),
                                            ),
                                        ],
                                      ),
                                    ),
                                    const Icon(Icons.chevron_right, size: 20),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
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
