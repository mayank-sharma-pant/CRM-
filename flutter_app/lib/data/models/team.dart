class Team {
  final int id;
  final String name;
  final int? memberCount;

  const Team({required this.id, required this.name, this.memberCount});

  factory Team.fromJson(Map<String, dynamic> json) => Team(
        id: json['id'] as int,
        name: json['name'] as String,
        memberCount: json['member_count'] as int?,
      );
}
