class AppNotification {
  final int id;
  final String title;
  final String? message;
  final String type;
  final String? link;
  final bool isRead;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.title,
    this.message,
    required this.type,
    this.link,
    required this.isRead,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as int,
        title: json['title'] as String,
        message: json['message'] as String?,
        type: json['type'] as String? ?? 'info',
        link: json['link'] as String?,
        isRead: json['is_read'] == true,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'])
            : null,
      );
}
