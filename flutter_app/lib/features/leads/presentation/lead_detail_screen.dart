import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/sheets/create_task_sheet.dart';
import 'package:perioxia_crm/shared/sheets/add_note_sheet.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/status_badge.dart';
import 'package:timeago/timeago.dart' as timeago;

final _leadFullProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.leadById(id));
  return Map<String, dynamic>.from(response.data);
});

final _leadTimelineProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, int>((ref, id) async {
  final api = ref.read(apiClientProvider);
  try {
    final response = await api.get(ApiEndpoints.leadTimeline(id));
    return List<Map<String, dynamic>>.from(response.data['events'] ?? []);
  } catch (_) {
    return [];
  }
});

class LeadDetailScreen extends ConsumerWidget {
  final int leadId;

  const LeadDetailScreen({super.key, required this.leadId});

  static const _statuses = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Converted',
    'Lost',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadAsync = ref.watch(_leadFullProvider(leadId));
    final timelineAsync = ref.watch(_leadTimelineProvider(leadId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lead Details'),
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
      body: leadAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load lead',
          onRetry: () => ref.invalidate(_leadFullProvider(leadId)),
        ),
        data: (data) {
          final name = data['name'] ?? '';
          final status = data['status']?.toString() ?? 'New';
          final company = data['company'] as String?;
          final email = data['email'] as String?;
          final phone = data['phone'] as String?;
          final source = data['source'] as String?;
          final serviceType = data['service_type'] as String?;
          final assignee = data['assignee'] as Map<String, dynamic>?;
          final value = (data['value'] as num?)?.toDouble();
          final convertedClientId = data['converted_client_id'] as int?;
          final tasks = List<Map<String, dynamic>>.from(data['tasks'] ?? []);
          final notes = List<Map<String, dynamic>>.from(data['notes_list'] ?? data['notes'] ?? []);
          final createdAt = data['created_at'] != null
              ? DateTime.tryParse(data['created_at'].toString())
              : null;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(_leadFullProvider(leadId));
              ref.invalidate(_leadTimelineProvider(leadId));
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Header
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w700)),
                          if (company != null)
                            Text(company,
                                style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Status + Convert
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _statuses.contains(status) ? status : null,
                        decoration: InputDecoration(
                          labelText: 'Status',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        items: _statuses
                            .map((s) =>
                                DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (v) async {
                          if (v == null || v == status) return;
                          await _updateStatus(ref, v);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    if (status.toLowerCase() != 'converted' &&
                        convertedClientId == null)
                      FilledButton.icon(
                        onPressed: () => _convertToClient(context, ref),
                        icon: const Icon(Icons.transform, size: 16),
                        label: const Text('Convert',
                            style: TextStyle(fontSize: 12)),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.success,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                        ),
                      ),
                    if (convertedClientId != null)
                      OutlinedButton.icon(
                        onPressed: () =>
                            context.push('/clients/$convertedClientId'),
                        icon: const Icon(Icons.open_in_new, size: 14),
                        label: const Text('View Client',
                            style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
                if (ref.watch(authProvider).user?.isManager == true) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _reassignLead(
                        context,
                        ref,
                        leadId,
                        data['assigned_to_id'] as int?,
                      ),
                      icon: const Icon(Icons.swap_horiz, size: 18),
                      label: const Text('Reassign to sales rep'),
                    ),
                  ),
                ],
                const SizedBox(height: 20),

                // Info section
                _SectionTitle(title: 'Lead Overview'),
                const SizedBox(height: 8),
                _InfoRow(icon: Icons.email_outlined, label: 'Email', value: email ?? '—'),
                _InfoRow(icon: Icons.phone_outlined, label: 'Phone', value: phone ?? '—'),
                _InfoRow(icon: Icons.source_outlined, label: 'Source', value: source ?? '—'),
                if (serviceType != null)
                  _InfoRow(icon: Icons.category_outlined, label: 'Service', value: serviceType),
                if (value != null)
                  _InfoRow(icon: Icons.attach_money, label: 'Value', value: '₹${value.toStringAsFixed(0)}'),
                if (assignee != null)
                  _InfoRow(
                      icon: Icons.person_outline,
                      label: 'Assigned',
                      value: assignee['full_name']?.toString() ?? '—'),
                if (createdAt != null)
                  _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Created',
                      value: DateFormat('MMM d, yyyy').format(createdAt)),
                const SizedBox(height: 20),

                // Tasks section
                if (tasks.isNotEmpty) ...[
                  _SectionTitle(title: 'Pending Tasks'),
                  const SizedBox(height: 8),
                  ...tasks.where((t) => t['status']?.toString().toLowerCase() != 'completed').map((t) =>
                      _TaskItem(
                        task: t,
                        onComplete: () async {
                          final api = ref.read(apiClientProvider);
                          final taskId = t['id'] as int;
                          await api.post(ApiEndpoints.completeTask(taskId));
                          ref.invalidate(_leadFullProvider(leadId));
                        },
                      )),
                  const SizedBox(height: 16),
                ],

                // Notes section
                _SectionTitle(title: 'Notes'),
                const SizedBox(height: 8),
                if (notes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text('No notes yet',
                        style: TextStyle(
                            fontSize: 13, color: AppColors.textMuted)),
                  ),
                ...notes.map((n) => _NoteItem(note: n)),
                OutlinedButton.icon(
                  onPressed: () => _addNote(context, ref),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Note', style: TextStyle(fontSize: 12)),
                ),
                const SizedBox(height: 20),

                // Timeline
                timelineAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (events) {
                    if (events.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _SectionTitle(title: 'Activity Timeline'),
                        const SizedBox(height: 8),
                        ...events.take(10).map((e) => _TimelineItem(event: e)),
                      ],
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _updateStatus(WidgetRef ref, String newStatus) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.put(ApiEndpoints.leadById(leadId), data: {'status': newStatus});
      ref.invalidate(_leadFullProvider(leadId));
      ref.invalidate(_leadTimelineProvider(leadId));
    } catch (_) {}
  }

  Future<void> _convertToClient(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Convert to Client?'),
        content: const Text('This lead will be marked as Converted and a client record will be created.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Convert')),
        ],
      ),
    );
    if (confirmed != true) return;
    final api = ref.read(apiClientProvider);
    try {
      await api.post(ApiEndpoints.leadConvert(leadId));
      ref.invalidate(_leadFullProvider(leadId));
      ref.invalidate(_leadTimelineProvider(leadId));
    } catch (_) {}
  }

  void _addTask(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CreateTaskSheet(
        leadId: leadId,
        onCreated: () => ref.invalidate(_leadFullProvider(leadId)),
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
        endpoint: ApiEndpoints.leadNotes(leadId),
        onAdded: () => ref.invalidate(_leadFullProvider(leadId)),
      ),
    );
  }

  Future<void> _reassignLead(
    BuildContext context,
    WidgetRef ref,
    int leadId,
    int? currentId,
  ) async {
    final team = await ref.read(managerRepositoryProvider).getTeam();
    final roster =
        List<Map<String, dynamic>>.from(team['team'] ?? []);
    int? pick = currentId;
    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          title: const Text('Reassign lead'),
          content: DropdownButtonFormField<int>(
            value: pick,
            items: roster
                .map((m) => DropdownMenuItem(
                      value: m['id'] as int,
                      child: Text(m['full_name']?.toString() ?? ''),
                    ))
                .toList(),
            onChanged: (v) => setSt(() => pick = v),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (pick == null) return;
                await ref
                    .read(managerRepositoryProvider)
                    .reassignLead(leadId, pick!);
                if (ctx.mounted) Navigator.pop(ctx);
                ref.invalidate(_leadFullProvider(leadId));
                ref.invalidate(_leadTimelineProvider(leadId));
              },
              child: const Text('Reassign'),
            ),
          ],
        ),
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

class _TaskItem extends StatelessWidget {
  final Map<String, dynamic> task;
  final VoidCallback onComplete;

  const _TaskItem({required this.task, required this.onComplete});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onComplete,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.textMuted, width: 2),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task['title'] ?? '',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                if (task['due_date'] != null || task['due_date_iso'] != null)
                  Text(
                    'Due: ${task['due_date'] ?? task['due_date_iso']}',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textMuted),
                  ),
              ],
            ),
          ),
          if (task['priority'] != null)
            StatusBadge(label: task['priority']),
        ],
      ),
    );
  }
}

class _NoteItem extends StatelessWidget {
  final Map<String, dynamic> note;
  const _NoteItem({required this.note});

  @override
  Widget build(BuildContext context) {
    final content = note['content']?.toString() ?? '';
    final createdAt = note['created_at'] != null
        ? DateTime.tryParse(note['created_at'].toString())
        : null;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(content, style: const TextStyle(fontSize: 13)),
          if (createdAt != null) ...[
            const SizedBox(height: 4),
            Text(timeago.format(createdAt),
                style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final Map<String, dynamic> event;
  const _TimelineItem({required this.event});

  IconData get _icon {
    final action = event['action']?.toString().toLowerCase() ?? '';
    if (action.contains('created')) return Icons.add_circle_outline;
    if (action.contains('status')) return Icons.swap_horiz;
    if (action.contains('note')) return Icons.note_add_outlined;
    if (action.contains('task')) return Icons.task_alt;
    if (action.contains('convert')) return Icons.transform;
    return Icons.circle_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final ts = event['timestamp'] != null
        ? DateTime.tryParse(event['timestamp'].toString())
        : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _buildLabel(),
                  style: const TextStyle(fontSize: 13),
                ),
                if (ts != null)
                  Text(timeago.format(ts),
                      style: TextStyle(
                          fontSize: 10, color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _buildLabel() {
    final action = event['action']?.toString() ?? 'Activity';
    final admin = event['admin_name']?.toString();
    final before = event['before_value']?.toString();
    final after = event['after_value']?.toString();

    var text = action;
    if (admin != null) text = '$admin — $text';
    if (before != null && after != null) text += ': $before → $after';
    return text;
  }
}
