import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/whatsapp_repository.dart';
import 'package:perioxia_crm/features/conversations/providers/conversations_provider.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:url_launcher/url_launcher.dart';

class ConversationThreadScreen extends ConsumerStatefulWidget {
  final int? leadId;
  final int? clientId;
  final String title;
  final String? phone;

  const ConversationThreadScreen({
    super.key,
    this.leadId,
    this.clientId,
    required this.title,
    this.phone,
  });

  @override
  ConsumerState<ConversationThreadScreen> createState() => _ConversationThreadScreenState();
}

class _ConversationThreadScreenState extends ConsumerState<ConversationThreadScreen> {
  final _body = TextEditingController();
  var _sending = false;

  ThreadQuery get _query => ThreadQuery(leadId: widget.leadId, clientId: widget.clientId);

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(threadMessagesProvider(_query));
    final digits = (widget.phone ?? '').replaceAll(RegExp(r'\D'), '');

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          if (digits.isNotEmpty)
            IconButton(
              tooltip: 'Open WhatsApp',
              onPressed: () => _openWa(digits),
              icon: const Icon(Icons.open_in_new),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              loading: () => const LoadingIndicator(),
              error: (_, __) => ErrorBanner(
                message: 'Could not load messages',
                onRetry: () => ref.invalidate(threadMessagesProvider(_query)),
              ),
              data: (page) {
                final items = page.items.reversed.toList();
                return Column(
                  children: [
                    if (!page.sessionOpen)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        child: Text(
                          'Session window is closed. A template send from the web, or WhatsApp on the phone, can reopen it.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ),
                    Expanded(
                      child: items.isEmpty
                          ? const Center(child: Text('No messages yet'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: items.length,
                              itemBuilder: (_, i) {
                                final msg = items[i];
                                final align = msg.isInbound ? Alignment.centerLeft : Alignment.centerRight;
                                final bg = msg.isInbound
                                    ? Theme.of(context).colorScheme.surfaceContainerHighest
                                    : AppColors.primary.withOpacity(0.15);
                                final when = msg.createdAt?.toLocal();
                                return Align(
                                  alignment: align,
                                  child: Container(
                                    constraints: const BoxConstraints(maxWidth: 280),
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(msg.body?.trim().isNotEmpty == true ? msg.body!.trim() : '—'),
                                        if (when != null)
                                          Text(
                                            DateFormat('d MMM, h:mm a').format(when),
                                            style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _body,
                      minLines: 1,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Reply in the open session',
                        isDense: true,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _sending ? null : () => _send(),
                    icon: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _send() async {
    final text = _body.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(whatsAppRepositoryProvider).sendSession(
            body: text,
            leadId: widget.leadId,
            clientId: widget.clientId,
          );
      _body.clear();
      ref.invalidate(threadMessagesProvider(_query));
      ref.invalidate(conversationThreadsProvider);
    } catch (e) {
      if (!mounted) return;
      var message = 'Could not send';
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['detail'] is String) message = data['detail'] as String;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _openWa(String digits) async {
    final uri = Uri.parse('https://wa.me/$digits');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
