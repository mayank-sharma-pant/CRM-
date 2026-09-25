import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/whatsapp_thread.dart';
import 'package:perioxia_crm/data/repositories/whatsapp_repository.dart';

final unansweredOnlyProvider = StateProvider<bool>((ref) => false);

final conversationThreadsProvider =
    FutureProvider.autoDispose<List<WhatsAppThread>>((ref) async {
  final unanswered = ref.watch(unansweredOnlyProvider);
  return ref.read(whatsAppRepositoryProvider).threads(unanswered: unanswered);
});

class ThreadQuery {
  final int? leadId;
  final int? clientId;

  const ThreadQuery({this.leadId, this.clientId});

  @override
  bool operator ==(Object other) =>
      other is ThreadQuery && other.leadId == leadId && other.clientId == clientId;

  @override
  int get hashCode => Object.hash(leadId, clientId);
}

final threadMessagesProvider = FutureProvider.autoDispose
    .family<({List<WhatsAppChatMessage> items, bool sessionOpen}), ThreadQuery>(
        (ref, query) {
  return ref.read(whatsAppRepositoryProvider).messages(
        leadId: query.leadId,
        clientId: query.clientId,
      );
});
