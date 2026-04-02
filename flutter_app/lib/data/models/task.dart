class Task {
  final int id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final int? assignedToId;
  final String? assignedToName;
  final int? assignedById;
  final bool isManagerAssigned;
  final int? leadId;
  final int? clientId;
  final DateTime? createdAt;

  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    this.completedAt,
    this.assignedToId,
    this.assignedToName,
    this.assignedById,
    this.isManagerAssigned = false,
    this.leadId,
    this.clientId,
    this.createdAt,
  });

  bool get isCompleted => status == 'Completed';
  bool get isOverdue =>
      dueDate != null && !isCompleted && dueDate!.isBefore(DateTime.now());

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: json['id'] as int,
        title: json['title'] as String,
        description: json['description'] as String?,
        status: json['status']?.toString() ?? 'Pending',
        priority: json['priority']?.toString() ?? 'Medium',
        dueDate: json['due_date'] != null
            ? DateTime.tryParse(json['due_date'])
            : null,
        completedAt: json['completed_at'] != null
            ? DateTime.tryParse(json['completed_at'])
            : null,
        assignedToId: json['assigned_to_id'] as int?,
        assignedToName: json['assigned_to_name'] as String?,
        assignedById: json['assigned_by_id'] as int?,
        isManagerAssigned: json['is_manager_assigned'] == true,
        leadId: json['lead_id'] as int?,
        clientId: json['client_id'] as int?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'])
            : null,
      );
}
