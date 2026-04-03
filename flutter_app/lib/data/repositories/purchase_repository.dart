import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';

final purchaseRepositoryProvider = Provider<PurchaseRepository>((ref) {
  return PurchaseRepository(ref.read(apiClientProvider));
});

class PurchaseRepository {
  final ApiClient _api;

  PurchaseRepository(this._api);

  Future<Map<String, dynamic>> getDashboard() async {
    final r = await _api.get(ApiEndpoints.purchaseDashboard);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listSales({
    String? status,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.purchaseSales, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getSale(int saleId) async {
    final r = await _api.get(ApiEndpoints.purchaseSale(saleId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> approveSale(int saleId, {String? notes}) async {
    final r = await _api.post(
      ApiEndpoints.purchaseSaleApprove(saleId),
      queryParameters: {if (notes != null && notes.isNotEmpty) 'notes': notes},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> rejectSale(int saleId, String reason) async {
    final r = await _api.post(
      ApiEndpoints.purchaseSaleReject(saleId),
      queryParameters: {'reason': reason},
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> listInvoices({
    String? status,
    int skip = 0,
    int limit = 100,
  }) async {
    final r = await _api.get(ApiEndpoints.purchaseInvoices, queryParameters: {
      'skip': skip,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getInvoice(int invoiceId) async {
    final r = await _api.get(ApiEndpoints.purchaseInvoice(invoiceId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> sendInvoice(int invoiceId) async {
    final r = await _api.post(ApiEndpoints.purchaseInvoiceSend(invoiceId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> markInvoicePaid(
    int invoiceId, {
    required String paymentDateYyyyMmDd,
    String paymentMethod = 'bank_transfer',
    String? reference,
  }) async {
    final r = await _api.post(
      ApiEndpoints.purchaseInvoiceMarkPaid(invoiceId),
      queryParameters: {
        'payment_date': paymentDateYyyyMmDd,
        'payment_method': paymentMethod,
        if (reference != null && reference.isNotEmpty) 'reference': reference,
      },
    );
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> sendPaymentReminder(int invoiceId) async {
    final r = await _api.post(ApiEndpoints.purchaseInvoiceReminder(invoiceId));
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> getMonitoring() async {
    final r = await _api.get(ApiEndpoints.purchaseMonitoring);
    return Map<String, dynamic>.from(r.data);
  }

  Future<Map<String, dynamic>> createInvoice({
    required int clientId,
    required List<Map<String, dynamic>> items,
    double tax = 0,
    double discount = 0,
    String? notes,
    int dueDays = 30,
  }) async {
    final r = await _api.post(ApiEndpoints.purchaseInvoices, data: {
      'client_id': clientId,
      'items': items,
      'tax': tax,
      'discount': discount,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      'due_days': dueDays,
    });
    return Map<String, dynamic>.from(r.data);
  }
}
