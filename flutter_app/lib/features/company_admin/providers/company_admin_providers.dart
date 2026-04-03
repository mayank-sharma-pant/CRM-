import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';

final companyAdminDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(companyAdminRepositoryProvider).getDashboardStats();
});

final companyAdminUsersProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(companyAdminRepositoryProvider).listUsers(limit: 200);
});

final companyAdminTeamsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(companyAdminRepositoryProvider).listTeams(limit: 200);
});

final companyAdminUserDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>(
        (ref, userId) async {
  return ref.read(companyAdminRepositoryProvider).getUser(userId);
});

final companyAdminTeamDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>(
        (ref, teamId) async {
  return ref.read(companyAdminRepositoryProvider).getTeam(teamId);
});

final companyAdminApprovalsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(companyAdminRepositoryProvider).getApprovals(limit: 200);
});

final companyAdminTransfersProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(companyAdminRepositoryProvider).getTransferRequests(
        status: 'pending',
      );
});
