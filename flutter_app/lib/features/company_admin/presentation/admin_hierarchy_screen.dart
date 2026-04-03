import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminHierarchyScreen extends ConsumerWidget {
  const AdminHierarchyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyAdminHierarchyProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Organisation hierarchy',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load hierarchy',
          onRetry: () => ref.invalidate(companyAdminHierarchyProvider),
        ),
        data: (d) {
          final tree = List<Map<String, dynamic>>.from(d['hierarchy'] ?? d['teams'] ?? []);
          if (tree.isEmpty) {
            return const Center(
                child: Text('No hierarchy data',
                    style: TextStyle(color: AppColors.textMuted)));
          }
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(companyAdminHierarchyProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: tree.length,
              itemBuilder: (_, i) => _HierarchyNode(node: tree[i], depth: 0),
            ),
          );
        },
      ),
    );
  }
}

class _HierarchyNode extends StatelessWidget {
  final Map<String, dynamic> node;
  final int depth;

  const _HierarchyNode({required this.node, required this.depth});

  @override
  Widget build(BuildContext context) {
    final name = node['name']?.toString() ?? node['team_name']?.toString() ?? '—';
    final manager = node['manager']?.toString() ?? node['manager_name']?.toString();
    final members = List<Map<String, dynamic>>.from(node['members'] ?? []);
    final children = List<Map<String, dynamic>>.from(node['children'] ?? []);

    return Padding(
      padding: EdgeInsets.only(left: depth * 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: Theme.of(context).dividerColor.withOpacity(0.12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.groups_outlined,
                        size: 18, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                    ),
                    if (members.isNotEmpty)
                      Text('${members.length} member${members.length > 1 ? 's' : ''}',
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textMuted)),
                  ],
                ),
                if (manager != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('Manager: $manager',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                  ),
                if (members.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: members
                        .map((m) => Chip(
                              label: Text(
                                m['name']?.toString() ??
                                    m['full_name']?.toString() ??
                                    '—',
                                style: const TextStyle(fontSize: 11),
                              ),
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                            ))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
          ...children
              .map((c) => _HierarchyNode(node: c, depth: depth + 1)),
        ],
      ),
    );
  }
}
