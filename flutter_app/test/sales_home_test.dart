import 'package:flutter_test/flutter_test.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/data/models/user.dart';

User _user({required String role, int? companyId}) => User(
      id: 1,
      email: 'a@b.com',
      fullName: 'A',
      role: role,
      companyId: companyId,
    );

void main() {
  test('sales home is leads', () {
    expect(homePathForUser(_user(role: 'sales', companyId: 1)), '/leads');
  });

  test('manager home stays dashboard', () {
    expect(homePathForUser(_user(role: 'manager', companyId: 1)), '/dashboard');
  });

  test('platform admin home is pending', () {
    expect(homePathForUser(_user(role: 'admin', companyId: null)), '/platform-pending');
  });

  test('sales nav index maps follow-ups and invoices', () {
    expect(salesNavIndex('/leads/12'), 0);
    expect(salesNavIndex('/follow-ups'), 1);
    expect(salesNavIndex('/invoices/3'), 2);
    expect(salesNavIndex('/more'), 3);
  });

  test('invoice list prefers items key', () {
    final rows = invoiceItemsFromResponse({
      'items': [
        {'id': 1, 'invoice_number': 'INV-1'},
      ],
      'invoices': [],
    });
    expect(rows, hasLength(1));
    expect(rows.first['id'], 1);
  });

  test('gst rows split intra-state tax', () {
    final rows = gstTaxRows({'tax_mode': 'intra', 'cgst': 18, 'sgst': 18, 'tax': 36});
    expect(rows.map((e) => e.key).toList(), ['CGST', 'SGST']);
  });
}
