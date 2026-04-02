class User {
  final int id;
  final String email;
  final String fullName;
  final String role;
  final String? status;
  final String? phone;
  final int? companyId;
  final int? teamId;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.status,
    this.phone,
    this.companyId,
    this.teamId,
  });

  bool get isSales => role == 'sales';
  bool get isManager => role == 'manager';
  bool get isMD => role == 'md';
  bool get isPurchase => role == 'purchase';
  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        email: json['email'] as String,
        fullName: json['full_name'] as String,
        role: _roleString(json['role']),
        status: json['status']?.toString(),
        phone: json['phone'] as String?,
        companyId: json['company_id'] as int?,
        teamId: json['team_id'] as int?,
      );

  static String _roleString(dynamic role) {
    if (role is String) return role;
    if (role is Map && role.containsKey('value')) return role['value'] as String;
    return role.toString();
  }
}
