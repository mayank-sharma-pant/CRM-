class FollowUp {
  final int id;
  final int leadId;
  final String? leadName;
  final String? leadCompany;
  final String status;
  final String? notes;
  final String? outcome;
  final DateTime? scheduledDate;
  final String? scheduledTime;
  final DateTime? completedAt;
  final DateTime? createdAt;

  const FollowUp({
    required this.id,
    required this.leadId,
    this.leadName,
    this.leadCompany,
    required this.status,
    this.notes,
    this.outcome,
    this.scheduledDate,
    this.scheduledTime,
    this.completedAt,
    this.createdAt,
  });

  bool get isOverdue =>
      status.toLowerCase() != 'completed' &&
      scheduledDate != null &&
      scheduledDate!.isBefore(DateTime.now().subtract(const Duration(hours: 12)));

  bool get isDueToday {
    if (scheduledDate == null || status.toLowerCase() == 'completed') return false;
    final now = DateTime.now();
    return scheduledDate!.year == now.year &&
        scheduledDate!.month == now.month &&
        scheduledDate!.day == now.day;
  }

  factory FollowUp.fromJson(Map<String, dynamic> json) => FollowUp(
        id: json['id'] as int,
        leadId: json['lead_id'] as int,
        leadName: json['lead_name'] as String?,
        leadCompany: json['lead_company'] as String?,
        status: json['status']?.toString() ?? 'Pending',
        notes: json['notes'] as String?,
        outcome: json['outcome'] as String?,
        scheduledDate: json['scheduled_date'] != null
            ? DateTime.tryParse(json['scheduled_date'].toString())
            : null,
        scheduledTime: json['scheduled_time'] as String?,
        completedAt: json['completed_at'] != null
            ? DateTime.tryParse(json['completed_at'].toString())
            : null,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}
