import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/whatsapp_thread.dart';
import 'package:perioxia_crm/features/conversations/providers/conversations_provider.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unanswered = ref.watch(unansweredOnlyProvider);
    final threadsAsync = ref.watch(conversationThreadsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conversations',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: !unanswered,
                  showCheckmark: false,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: !unanswered ? Colors.white : AppColors.textSecondary,
                  ),
                  onSelected: (_) =>
                      ref.read(unansweredOnlyProvider.notifier).state = false,
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Unanswered'),
                  selected: unanswered,
                  showCheckmark: false,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: unanswered ? Colors.white : AppColors.textSecondary,
                  ),
                  onSelected: (_) =>
                      ref.read(unansweredOnlyProvider.notifier).state = true,
                ),
              ],
            ),
          ),
          Expanded(
            child: threadsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (_, __) => ErrorBanner(
                message: 'Could not load conversations',
                onRetry: () => ref.invalidate(conversationThreadsProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.chat_bubble_outline,
                    title: 'No conversations yet',
                    subtitle: 'WhatsApp threads for your leads show up here',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(conversationThreadsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _ThreadTile(thread: items[i]),
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

class _ThreadTile extends StatelessWidget {
  final WhatsAppThread thread;

  const _ThreadTile({required this.thread});

  @override
  Widget build(BuildContext context) {
    final when = DateTime.tryParse(thread.lastAt ?? '');
    final stamp = when == null ? '' : DateFormat('d MMM, h:mm a').format(when.toLocal());
    final canOpen = thread.leadId != null || thread.clientId != null;
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        title: Text(thread.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          thread.lastBody?.trim().isNotEmpty == true ? thread.lastBody!.trim() : 'No message',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (stamp.isNotEmpty)
              Text(stamp, style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
            if (thread.unanswered)
              const Text('Unanswered',
                  style: TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w700)),
          ],
        ),
        onTap: canOpen
            ? () {
                final params = <String, String>{
                  'name': thread.title,
                  if (thread.leadId != null) 'leadId': '${thread.leadId}',
                  if (thread.leadId == null && thread.clientId != null)
                    'clientId': '${thread.clientId}',
                  if ((thread.phone ?? '').isNotEmpty) 'phone': thread.phone!,
                };
                context.push(Uri(path: '/conversations/thread', queryParameters: params).toString());
              }
            : () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('This thread has no lead to open')),
                );
              },
      ),
    );
  }
}
