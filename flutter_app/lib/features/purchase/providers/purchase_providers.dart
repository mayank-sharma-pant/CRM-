import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/repositories/purchase_repository.dart';

final purchaseDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(purchaseRepositoryProvider).getDashboard();
});

final purchaseSalesProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(purchaseRepositoryProvider).listSales(limit: 200);
});

final purchaseSaleDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>(
        (ref, id) async {
  return ref.read(purchaseRepositoryProvider).getSale(id);
});

final purchaseInvoicesProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String?>(
        (ref, status) async {
  return ref.read(purchaseRepositoryProvider).listInvoices(
        status: status,
        limit: 200,
      );
});

final purchaseInvoiceDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, int>(
        (ref, id) async {
  return ref.read(purchaseRepositoryProvider).getInvoice(id);
});

final purchaseMonitoringProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.read(purchaseRepositoryProvider).getMonitoring();
});
