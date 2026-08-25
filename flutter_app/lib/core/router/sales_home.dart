import 'package:perioxia_crm/data/models/user.dart';

/// Post-login home. Sales field path is leads, not dashboard.
String homePathForUser(User? user) {
  if (user == null) return '/login';
  if (user.isPlatformAdmin) return '/platform-pending';
  if (user.isSales) return '/leads';
  return '/dashboard';
}

/// Sales bottom tabs: lead + follow-up + invoice, plus More.
const salesNavPaths = [
  '/leads',
  '/follow-ups',
  '/invoices',
  '/more',
];

int salesNavIndex(String location) {
  if (location.startsWith('/follow-ups')) return 1;
  if (location.startsWith('/invoices') || location.startsWith('/orders')) {
    return 2;
  }
  if (location.startsWith('/more') ||
      location.startsWith('/settings') ||
      location.startsWith('/profile') ||
      location.startsWith('/notifications') ||
      location.startsWith('/clients') ||
      location.startsWith('/tasks') ||
      location.startsWith('/stock') ||
      location.startsWith('/assistant') ||
      location.startsWith('/dashboard') ||
      location.startsWith('/performance') ||
      location.startsWith('/sales-reports') ||
      location.startsWith('/report-bug') ||
      location.startsWith('/finance-ledgers')) {
    return 3;
  }
  return 0;
}

List<Map<String, dynamic>> invoiceItemsFromResponse(dynamic raw) {
  if (raw is List) {
    return List<Map<String, dynamic>>.from(raw);
  }
  if (raw is Map) {
    final items = raw['items'] ?? raw['invoices'];
    if (items is List) {
      return List<Map<String, dynamic>>.from(items);
    }
  }
  return [];
}

/// Invoice GET uses tax_mode; legacy invoices only have tax.
List<MapEntry<String, num>> gstTaxRows(Map<dynamic, dynamic> inv) {
  final mode = inv['tax_mode']?.toString();
  num n(dynamic v) => v is num ? v : num.tryParse('$v') ?? 0;
  if (mode == 'intra') {
    return [
      MapEntry('CGST', n(inv['cgst'])),
      MapEntry('SGST', n(inv['sgst'])),
    ];
  }
  if (mode == 'inter') {
    return [MapEntry('IGST', n(inv['igst']))];
  }
  return [MapEntry('Tax', n(inv['tax']))];
}
