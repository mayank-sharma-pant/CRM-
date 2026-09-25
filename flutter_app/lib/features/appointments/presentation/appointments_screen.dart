import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/meeting_item.dart';
import 'package:perioxia_crm/data/repositories/meeting_repository.dart';
import 'package:perioxia_crm/features/appointments/providers/appointments_provider.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AppointmentsScreen extends ConsumerWidget {
  const AppointmentsScreen({super.key});

  static const _buckets = <String?, String>{
    'today': 'Today',
    'upcoming': 'Upcoming',
    'overdue': 'Overdue',
    'completed': 'Completed',
    null: 'All',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bucket = ref.watch(appointmentBucketProvider);
    final meetingsAsync = ref.watch(appointmentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Appointments',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _create(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New'),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              children: _buckets.entries.map((entry) {
                final active = entry.key == bucket;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(entry.value),
                    selected: active,
                    showCheckmark: false,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: active ? Colors.white : AppColors.textSecondary,
                    ),
                    onSelected: (_) =>
                        ref.read(appointmentBucketProvider.notifier).state = entry.key,
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: meetingsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: _detail(e, 'Could not load appointments'),
                onRetry: () => ref.invalidate(appointmentsProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.event_available_outlined,
                    title: 'No appointments',
                    subtitle: 'Scheduled meetings in this filter show up here',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(appointmentsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _MeetingCard(item: items[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final subjectCtrl = TextEditingController();
    final leadCtrl = TextEditingController();
    DateTime? when;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('New appointment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: subjectCtrl,
                decoration: const InputDecoration(labelText: 'Subject'),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: leadCtrl,
                decoration: const InputDecoration(labelText: 'Lead id (optional)'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: ctx,
                      firstDate: DateTime.now().subtract(const Duration(days: 1)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      initialDate: when ?? DateTime.now(),
                    );
                    if (date == null || !ctx.mounted) return;
                    final time = await showTimePicker(
                      context: ctx,
                      initialTime: TimeOfDay.fromDateTime(when ?? DateTime.now()),
                    );
                    if (time == null) return;
                    setLocal(() {
                      when = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                    });
                  },
                  child: Text(when == null
                      ? 'Pick date and time'
                      : DateFormat('d MMM, h:mm a').format(when!)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
          ],
        ),
      ),
    );
    final subject = subjectCtrl.text.trim();
    final leadId = int.tryParse(leadCtrl.text.trim());
    subjectCtrl.dispose();
    leadCtrl.dispose();
    if (saved != true || !context.mounted) return;
    if (subject.isEmpty || when == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subject and time are required')),
      );
      return;
    }
    try {
      await ref.read(meetingRepositoryProvider).create(
            subject: subject,
            startsAt: when!.toUtc().toIso8601String(),
            leadId: leadId,
          );
      ref.invalidate(appointmentsProvider);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_detail(e, 'Could not create appointment'))),
      );
    }
  }
}

class _MeetingCard extends ConsumerWidget {
  final MeetingItem item;

  const _MeetingCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final when = item.startsAt?.toLocal();
    final whenLabel = when == null ? 'No time' : DateFormat('d MMM, h:mm a').format(when);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.subject, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              [
                whenLabel,
                if ((item.leadName ?? '').isNotEmpty) item.leadName!,
                item.status,
              ].join(' · '),
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            if (item.isScheduled)
              Row(
                children: [
                  TextButton(
                    onPressed: () => _setStatus(context, ref, 'completed'),
                    child: const Text('Complete'),
                  ),
                  TextButton(
                    onPressed: () => _setStatus(context, ref, 'cancelled'),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _setStatus(BuildContext context, WidgetRef ref, String status) async {
    try {
      await ref.read(meetingRepositoryProvider).setStatus(item.id, status);
      ref.invalidate(appointmentsProvider);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_detail(e, 'Could not update appointment'))),
      );
    }
  }
}

String _detail(Object error, String fallback) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['detail'] is String && (data['detail'] as String).isNotEmpty) {
      return data['detail'] as String;
    }
  }
  return fallback;
}
