import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/app_constants.dart';
import 'package:perioxia_crm/core/storage/secure_storage.dart';
import 'package:perioxia_crm/data/repositories/crm_platform_repository.dart';

/// Whether a platform JWT is stored (password login completed platform exchange).
final platformTokenPresentProvider = FutureProvider<bool>((ref) async {
  final t = await SecureStorage.read(AppConstants.platformAccessTokenKey);
  return t != null && t.isNotEmpty;
});

final crmPlatformMetricsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(crmPlatformRepositoryProvider).getMetricsDashboard();
});

final crmPlatformCompaniesProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String?>(
        (ref, status) async {
  return ref.read(crmPlatformRepositoryProvider).listCompanies(status: status);
});

final crmPlatformPendingProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(crmPlatformRepositoryProvider).listPendingCompanies();
});

final crmPlatformCompanyDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>(
        (ref, id) async {
  return ref.read(crmPlatformRepositoryProvider).getCompany(id);
});

final crmPlatformLogsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(crmPlatformRepositoryProvider).getLogs(days: 14, limit: 100);
});

final crmPlatformPlansProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(crmPlatformRepositoryProvider).getPlans();
});

final crmPlatformAuthMeProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(crmPlatformRepositoryProvider).getPlatformMe();
});
