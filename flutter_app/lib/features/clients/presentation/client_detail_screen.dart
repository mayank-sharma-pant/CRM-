import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/sheets/create_task_sheet.dart';
import 'package:perioxia_crm/shared/sheets/add_note_sheet.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/status_badge.dart';
import 'package:timeago/timeago.dart' as timeago;

final _clientFullProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.clientById(id));
  return Map<String, dynamic>.from(response.data);
});

class ClientDetailScreen extends ConsumerWidget {
  final int clientId;
  const ClientDetailScreen({super.key, required this.clientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientAsync = ref.watch(_clientFullProvider(clientId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Client Details'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'task') _addTask(context, ref);
              if (v == 'note') _addNote(context, ref);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'task', child: Text('Add Task')),
              const PopupMenuItem(value: 'note', child: Text('Add Note')),
            ],
          ),
        ],
      ),
      body: clientAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load client',
          onRetry: () =>
              ref.invalidate(_clientFullProvider(clientId)),
        ),
        data: (data) {
          final name = data['name']?.toString() ?? '';
          final email = data['email'] as String?;
          final phone = data['phone'] as String?;
          final company = data['company'] as String?;
          final assignee = data['assigned_to_name'] as String?;
          final invoices =
              List<Map<String, dynamic>>.from(data['invoices'] ?? []);
          final notes =
              List<Map<String, dynamic>>.from(data['notes'] ?? []);
          final tasks =
              List<Map<String, dynamic>>.from(data['tasks'] ?? []);
          final createdAt = data['created_at'] != null
              ? DateTime.tryParse(data['created_at'].toString())
              : null;

          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(_clientFullProvider(clientId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Header
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.success.withOpacity(0.1),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.success),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700)),
                          if (company != null)
                            Text(company,
                                style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    const StatusBadge(label: 'Active'),
                  ],
                ),
                const SizedBox(height: 20),

                // Info
                _SectionTitle(title: 'Contact Information'),
                const SizedBox(height: 8),
                _InfoRow(icon: Icons.email_outlined, label: 'Email', value: email ?? '—'),
                _InfoRow(icon: Icons.phone_outlined, label: 'Phone', value: phone ?? '—'),
                if (assignee != null)
                  _InfoRow(icon: Icons.person_outline, label: 'Assigned', value: assignee),
                if (createdAt != null)
                  _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Since',
                      value: DateFormat('MMM d, yyyy').format(createdAt)),
                const SizedBox(height: 20),

                // Tasks
                if (tasks.isNotEmpty) ...[
                  _SectionTitle(title: 'Tasks'),
                  const SizedBox(height: 8),
                  ...tasks.map((t) => _ClientTaskItem(task: t, ref: ref)),
                  const SizedBox(height: 16),
                ],

                // Invoices / Orders
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _SectionTitle(title: 'Orders (${invoices.length})'),
                    if (invoices.isNotEmpty)
                      GestureDetector(
                        onTap: () => context.push('/orders'),
                        child: Text('View all',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary)),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (invoices.isEmpty)
                  Text('No orders yet',
                      style: TextStyle(
                          fontSize: 13, color: AppColors.textMuted)),
                ...invoices.take(5).map((inv) {
                  final isPaid =
                      inv['status']?.toString().toLowerCase() == 'paid';
                  return GestureDetector(
                    onTap: () {
                      final id = inv['id'];
                      if (id != null) context.push('/invoices/$id');
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isPaid
                                ? Icons.check_circle
                                : Icons.receipt_long_outlined,
                            size: 16,
                            color: isPaid
                                ? AppColors.success
                                : AppColors.warning,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              inv['invoice_number'] ??
                                  'INV-${inv['id']}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (inv['total'] != null)
                            Text(
                                '₹${(inv['total'] as num).toStringAsFixed(0)}',
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 20),

                // Notes
                _SectionTitle(title: 'Notes'),
                const SizedBox(height: 8),
                if (notes.isEmpty)
                  Text('No notes yet',
                      style: TextStyle(
                          fontSize: 13, color: AppColors.textMuted)),
                ...notes.map((n) {
                  final createdNote = n['created_at'] != null
                      ? DateTime.tryParse(n['created_at'].toString())
                      : null;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(n['content']?.toString() ?? '',
                            style: const TextStyle(fontSize: 13)),
                        if (createdNote != null) ...[
                          const SizedBox(height: 4),
                          Text(timeago.format(createdNote),
                              style: TextStyle(
                                  fontSize: 10,
                                  color: AppColors.textMuted)),
                        ],
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _addNote(context, ref),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Note',
                      style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _addTask(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CreateTaskSheet(
        clientId: clientId,
        onCreated: () =>
            ref.invalidate(_clientFullProvider(clientId)),
      ),
    );
  }

  void _addNote(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => AddNoteSheet(
        endpoint: ApiEndpoints.clientNotes(clientId),
        onAdded: () =>
            ref.invalidate(_clientFullProvider(clientId)),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(title,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700));
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 14),
          SizedBox(
            width: 76,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 14)),
          ),
        ],
      ),
    );
  }
}

class _ClientTaskItem extends StatelessWidget {
  final Map<String, dynamic> task;
  final WidgetRef ref;

  const _ClientTaskItem({required this.task, required this.ref});

  @override
  Widget build(BuildContext context) {
    final isDone =
        task['status']?.toString().toLowerCase() == 'completed';
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding:
          const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle : Icons.circle_outlined,
            size: 18,
            color: isDone ? AppColors.success : AppColors.textMuted,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              task['title']?.toString() ?? '',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                decoration:
                    isDone ? TextDecoration.lineThrough : null,
                color: isDone ? AppColors.textMuted : null,
              ),
            ),
          ),
          if (task['priority'] != null)
            StatusBadge(label: task['priority']),
        ],
      ),
    );
  }
}
