class WhatsAppThread {
  final int? leadId;
  final int? clientId;
  final String? name;
  final String? phone;
  final String lastDirection;
  final String? lastBody;
  final String? lastAt;
  final bool unanswered;

  const WhatsAppThread({
    this.leadId,
    this.clientId,
    this.name,
    this.phone,
    required this.lastDirection,
    this.lastBody,
    this.lastAt,
    required this.unanswered,
  });

  String get title {
    final label = (name ?? '').trim();
    if (label.isNotEmpty) return label;
    final digits = (phone ?? '').trim();
    if (digits.isNotEmpty) return digits;
    return 'Conversation';
  }

  factory WhatsAppThread.fromJson(Map<String, dynamic> json) {
    return WhatsAppThread(
      leadId: json['lead_id'] as int?,
      clientId: json['client_id'] as int?,
      name: json['name']?.toString(),
      phone: json['phone']?.toString(),
      lastDirection: json['last_direction']?.toString() ?? 'outbound',
      lastBody: json['last_body']?.toString(),
      lastAt: json['last_at']?.toString(),
      unanswered: json['unanswered'] == true,
    );
  }
}

class WhatsAppChatMessage {
  final int id;
  final String direction;
  final String? body;
  final DateTime? createdAt;

  const WhatsAppChatMessage({
    required this.id,
    required this.direction,
    this.body,
    this.createdAt,
  });

  bool get isInbound => direction.toLowerCase() == 'inbound';

  factory WhatsAppChatMessage.fromJson(Map<String, dynamic> json) {
    return WhatsAppChatMessage(
      id: json['id'] as int,
      direction: json['direction']?.toString() ?? 'outbound',
      body: json['body']?.toString(),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
    );
  }
}
