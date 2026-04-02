class Lead {
  final int id;
  final String name;
  final String? email;
  final String? phone;
  final String? company;
  final String status;
  final String? source;
  final double? value;
  final int? assignedToId;
  final String? assignedToName;
  final int? teamId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? convertedAt;

  const Lead({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.company,
    required this.status,
    this.source,
    this.value,
    this.assignedToId,
    this.assignedToName,
    this.teamId,
    this.createdAt,
    this.updatedAt,
    this.convertedAt,
  });

  factory Lead.fromJson(Map<String, dynamic> json) => Lead(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        company: json['company'] as String?,
        status: json['status']?.toString() ?? 'New',
        source: json['source'] as String?,
        value: (json['value'] as num?)?.toDouble(),
        assignedToId: json['assigned_to_id'] as int?,
        assignedToName: json['assigned_to_name'] as String?,
        teamId: json['team_id'] as int?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'])
            : null,
        updatedAt: json['updated_at'] != null
            ? DateTime.tryParse(json['updated_at'])
            : null,
        convertedAt: json['converted_at'] != null
            ? DateTime.tryParse(json['converted_at'])
            : null,
      );
}
