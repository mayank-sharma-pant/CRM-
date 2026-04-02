import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/follow_up.dart';
import 'package:perioxia_crm/data/repositories/follow_up_repository.dart';
import 'package:perioxia_crm/features/follow_ups/providers/follow_ups_provider.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

class FollowUpsScreen extends ConsumerWidget {
  const FollowUpsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(followUpFilterProvider);
    final followUpsAsync = ref.watch(followUpsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Follow-ups',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateSheet(context, ref),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          // Filter tabs
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: FollowUpFilter.values.map((f) {
                final active = f == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(
                      f == FollowUpFilter.all
                          ? 'All'
                          : f == FollowUpFilter.today
                              ? 'Today'
                              : 'Overdue',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: active ? Colors.white : AppColors.textSecondary),
                    ),
                    selected: active,
                    onSelected: (_) =>
                        ref.read(followUpFilterProvider.notifier).state = f,
                    selectedColor: AppColors.primary,
                    showCheckmark: false,
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 4),

          Expanded(
            child: followUpsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load follow-ups',
                onRetry: () => ref.invalidate(followUpsProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.calendar_today,
                    title: 'No follow-ups',
                    subtitle: 'Create one to track your lead engagement',
                  );
                }

                final overdue = items.where((f) => f.isOverdue).toList();
                final today = items.where((f) => f.isDueToday && !f.isOverdue).toList();
                final upcoming = items
                    .where((f) =>
                        f.status.toLowerCase() != 'completed' &&
                        !f.isOverdue &&
                        !f.isDueToday)
                    .toList();
                final completed =
                    items.where((f) => f.status.toLowerCase() == 'completed').toList();

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(followUpsProvider),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (overdue.isNotEmpty) ...[
                        _GroupHeader(label: 'Overdue', color: AppColors.error, count: overdue.length),
                        ...overdue.map((f) => _FollowUpCard(followUp: f, ref: ref)),
                        const SizedBox(height: 16),
                      ],
                      if (today.isNotEmpty) ...[
                        _GroupHeader(label: 'Today', color: AppColors.warning, count: today.length),
                        ...today.map((f) => _FollowUpCard(followUp: f, ref: ref)),
                        const SizedBox(height: 16),
                      ],
                      if (upcoming.isNotEmpty) ...[
                        _GroupHeader(label: 'Upcoming', color: AppColors.info, count: upcoming.length),
                        ...upcoming.map((f) => _FollowUpCard(followUp: f, ref: ref)),
                        const SizedBox(height: 16),
                      ],
                      if (completed.isNotEmpty) ...[
                        _GroupHeader(label: 'Completed', color: AppColors.success, count: completed.length),
                        ...completed.map((f) => _FollowUpCard(followUp: f, ref: ref)),
                      ],
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

  void _showCreateSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CreateFollowUpSheet(ref: ref),
    );
  }
}

class _GroupHeader extends StatelessWidget {
  final String label;
  final Color color;
  final int count;

  const _GroupHeader(
      {required this.label, required this.color, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color),
          ),
          const SizedBox(width: 8),
          Text(label,
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(width: 6),
          Text('($count)',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _FollowUpCard extends StatelessWidget {
  final FollowUp followUp;
  final WidgetRef ref;

  const _FollowUpCard({required this.followUp, required this.ref});

  @override
  Widget build(BuildContext context) {
    final isCompleted = followUp.status.toLowerCase() == 'completed';
    final dateStr = followUp.scheduledDate != null
        ? DateFormat('MMM d, yyyy').format(followUp.scheduledDate!)
        : '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: followUp.isOverdue
              ? AppColors.error.withOpacity(0.3)
              : Theme.of(context).dividerColor.withOpacity(0.12),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: isCompleted ? null : () => _showCompleteDialog(context),
            child: Container(
              width: 22,
              height: 22,
              margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? AppColors.success : Colors.transparent,
                border: Border.all(
                  color: isCompleted ? AppColors.success : AppColors.textMuted,
                  width: 2,
                ),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => context.push('/leads/${followUp.leadId}'),
                  child: Text(
                    followUp.leadName ?? 'Lead #${followUp.leadId}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted ? AppColors.textMuted : AppColors.primary,
                    ),
                  ),
                ),
                if (followUp.leadCompany != null) ...[
                  const SizedBox(height: 2),
                  Text(followUp.leadCompany!,
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                ],
                if (followUp.notes != null && followUp.notes!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(followUp.notes!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                ],
                if (followUp.outcome != null) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('Outcome: ${followUp.outcome}',
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.success)),
                  ),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.calendar_today, size: 12, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(dateStr,
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textMuted)),
                ],
              ),
              if (followUp.scheduledTime != null) ...[
                const SizedBox(height: 2),
                Text(followUp.scheduledTime!,
                    style: TextStyle(
                        fontSize: 10, color: AppColors.textMuted)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _showCompleteDialog(BuildContext context) {
    final outcomeCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Follow-up',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: TextField(
          controller: outcomeCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Enter outcome (e.g. "Interested, will call back")',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final outcome = outcomeCtrl.text.trim();
              if (outcome.isEmpty) return;
              Navigator.pop(ctx);
              final repo = ref.read(followUpRepositoryProvider);
              await repo.complete(followUp.id, outcome);
              ref.invalidate(followUpsProvider);
            },
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }
}

class _CreateFollowUpSheet extends StatefulWidget {
  final WidgetRef ref;
  const _CreateFollowUpSheet({required this.ref});

  @override
  State<_CreateFollowUpSheet> createState() => _CreateFollowUpSheetState();
}

class _CreateFollowUpSheetState extends State<_CreateFollowUpSheet> {
  final _leadIdCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 10, minute: 0);
  bool _submitting = false;

  @override
  void dispose() {
    _leadIdCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('New Follow-up',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(
            controller: _leadIdCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Lead ID',
              prefixIcon: Icon(Icons.person_outline, size: 20),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) setState(() => _selectedDate = date);
                  },
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(DateFormat('MMM d, yyyy').format(_selectedDate),
                      style: const TextStyle(fontSize: 13)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: _selectedTime,
                    );
                    if (time != null) setState(() => _selectedTime = time);
                  },
                  icon: const Icon(Icons.schedule, size: 16),
                  label: Text(_selectedTime.format(context),
                      style: const TextStyle(fontSize: 13)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Notes (optional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Create Follow-up'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final leadId = int.tryParse(_leadIdCtrl.text.trim());
    if (leadId == null) return;
    setState(() => _submitting = true);
    try {
      final repo = widget.ref.read(followUpRepositoryProvider);
      await repo.create({
        'lead_id': leadId,
        'scheduled_date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'scheduled_time':
            '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}',
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
      });
      widget.ref.invalidate(followUpsProvider);
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() => _submitting = false);
    }
  }
}
