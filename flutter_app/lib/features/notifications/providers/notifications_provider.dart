import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/notification.dart';
import 'package:perioxia_crm/data/repositories/notification_repository.dart';

final notificationsProvider =
    FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final repo = ref.read(notificationRepositoryProvider);
  final result = await repo.getNotifications(limit: 50);
  return result.notifications;
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final repo = ref.read(notificationRepositoryProvider);
  final result = await repo.getNotifications(limit: 1);
  return result.unreadCount;
});
