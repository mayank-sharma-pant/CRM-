import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/data/models/notification.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.read(apiClientProvider));
});

class NotificationRepository {
  final ApiClient _api;

  NotificationRepository(this._api);

  Future<({List<AppNotification> notifications, int unreadCount})>
      getNotifications({int limit = 20, bool unreadOnly = false}) async {
    final response =
        await _api.get(ApiEndpoints.notifications, queryParameters: {
      'limit': limit,
      'unread_only': unreadOnly,
    });
    final list = response.data['notifications'] as List? ?? [];
    return (
      notifications: list.map((e) => AppNotification.fromJson(e)).toList(),
      unreadCount: response.data['unread_count'] as int? ?? 0,
    );
  }

  Future<void> markRead(int id) async {
    await _api.post(ApiEndpoints.markRead(id));
  }

  Future<void> markAllRead() async {
    await _api.post(ApiEndpoints.markAllRead);
  }
}
