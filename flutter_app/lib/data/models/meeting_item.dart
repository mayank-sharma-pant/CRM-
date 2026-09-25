class MeetingItem {
  final int id;
  final String subject;
  final String status;
  final DateTime? startsAt;
  final String? location;
  final int? leadId;
  final String? leadName;

  const MeetingItem({
    required this.id,
    required this.subject,
    required this.status,
    this.startsAt,
    this.location,
    this.leadId,
    this.leadName,
  });

  bool get isScheduled => status.toLowerCase() == 'scheduled';

  factory MeetingItem.fromJson(Map<String, dynamic> json) {
    return MeetingItem(
      id: json['id'] as int,
      subject: json['subject']?.toString() ?? '',
      status: json['status']?.toString() ?? 'scheduled',
      startsAt: DateTime.tryParse(json['starts_at']?.toString() ?? ''),
      location: json['location']?.toString(),
      leadId: json['lead_id'] as int?,
      leadName: json['lead_name']?.toString(),
    );
  }
}
