import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/md/providers/md_providers.dart';

class MdEmployeeLookupScreen extends ConsumerStatefulWidget {
  const MdEmployeeLookupScreen({super.key});

  @override
  ConsumerState<MdEmployeeLookupScreen> createState() =>
      _MdEmployeeLookupScreenState();
}

class _MdEmployeeLookupScreenState
    extends ConsumerState<MdEmployeeLookupScreen> {
  final _ctrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _applySearch() {
    setState(() => _query = _ctrl.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mdEmployeeLookupProvider(_query));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee lookup',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: InputDecoration(
                      hintText: 'Name or email…',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      isDense: true,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    onSubmitted: (_) => _applySearch(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _applySearch,
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator.adaptive()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Failed to load: $e',
                      textAlign: TextAlign.center),
                ),
              ),
              data: (d) {
                final list =
                    List<Map<String, dynamic>>.from(d['employees'] ?? []);
                if (list.isEmpty) {
                  return Center(
                    child: Text(
                      _query.isEmpty
                          ? 'Tap Search to list employees'
                          : 'No matches',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final e = list[i];
                    final uid = e['user_id'] as int?;
                    return Material(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uid == null
                            ? null
                            : () => context.push('/employee-lookup/$uid'),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor:
                                    AppColors.primary.withOpacity(0.1),
                                child: Text(
                                  (e['name']?.toString() ?? '?')[0]
                                      .toUpperCase(),
                                  style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(e['name']?.toString() ?? '—',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    Text(e['email']?.toString() ?? '',
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary)),
                                    Text(
                                      '${e['role']} · ${e['team'] ?? '—'}',
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                              Text(e['id']?.toString() ?? '',
                                  style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
