class Client {
  final int id;
  final String name;
  final String? email;
  final String? phone;
  final String? company;
  final int? assignedToId;
  final String? assignedToName;
  final int? teamId;
  final DateTime? createdAt;

  const Client({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.company,
    this.assignedToId,
    this.assignedToName,
    this.teamId,
    this.createdAt,
  });

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        company: json['company'] as String?,
        assignedToId: json['assigned_to_id'] as int?,
        assignedToName: json['assigned_to_name'] as String?,
        teamId: json['team_id'] as int?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'])
            : null,
      );
}
