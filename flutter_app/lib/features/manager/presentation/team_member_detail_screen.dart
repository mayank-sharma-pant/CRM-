import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';

final _memberPerfProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>((ref, id) async {
  final repo = ref.read(managerRepositoryProvider);
  return repo.getTeamMemberPerformance(id);
});

class TeamMemberDetailScreen extends ConsumerWidget {
  final int userId;

  const TeamMemberDetailScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_memberPerfProvider(userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team member'),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load member',
          onRetry: () => ref.invalidate(_memberPerfProvider(userId)),
        ),
        data: (data) {
          final member = data['member'] as Map<String, dynamic>? ?? {};
          final metrics = data['metrics'] as Map<String, dynamic>? ?? {};
          final leads = metrics['leads'] as Map<String, dynamic>? ?? {};
          final orders = metrics['orders'] as Map<String, dynamic>? ?? {};
          final tasks = metrics['tasks'] as Map<String, dynamic>? ?? {};

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: AppColors.primary.withOpacity(0.12),
                child: Text(
                  (member['full_name']?.toString() ?? '?')[0].toUpperCase(),
                  style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 12),
              Text(member['full_name']?.toString() ?? '',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w700)),
              Text(member['email']?.toString() ?? '',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 24),

              _Section(title: 'Leads', children: [
                _Row('Total', '${leads['total'] ?? 0}'),
                _Row('Converted', '${leads['converted'] ?? 0}'),
                _Row('Lost', '${leads['lost'] ?? 0}'),
                _Row('Conversion %', '${leads['conversion_rate'] ?? 0}%'),
              ]),
              const SizedBox(height: 16),
              _Section(title: 'Orders', children: [
                _Row('Count', '${orders['total_count'] ?? 0}'),
                _Row('Total value', '₹${(orders['total_value'] as num?)?.toStringAsFixed(0) ?? '0'}'),
                _Row('Paid', '₹${(orders['paid_value'] as num?)?.toStringAsFixed(0) ?? '0'}'),
              ]),
              const SizedBox(height: 16),
              _Section(title: 'Tasks', children: [
                _Row('Completed', '${tasks['completed'] ?? 0}'),
                _Row('Pending', '${tasks['pending'] ?? 0}'),
              ]),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () => context.push('/leads'),
                icon: const Icon(Icons.people_outline, size: 18),
                label: const Text('View team leads'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: Theme.of(context).dividerColor.withOpacity(0.12)),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  final String k;
  final String v;

  const _Row(this.k, this.v);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(color: AppColors.textSecondary)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
