import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/client.dart';
import 'package:perioxia_crm/data/repositories/client_repository.dart';
import 'package:perioxia_crm/data/repositories/purchase_repository.dart';
import 'package:perioxia_crm/features/purchase/providers/purchase_providers.dart';

class _LineItem {
  int? stockItemId;
  final TextEditingController description = TextEditingController();
  final TextEditingController quantity = TextEditingController(text: '1');
  final TextEditingController unitPrice = TextEditingController(text: '0');

  void dispose() {
    description.dispose();
    quantity.dispose();
    unitPrice.dispose();
  }
}

/// Bottom sheet to create a draft invoice via `POST /api/purchase/invoices` (same as web).
Future<void> showPurchaseCreateInvoiceSheet(
  BuildContext context,
  WidgetRef ref,
) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(ctx).bottom,
      ),
      child: const _PurchaseCreateInvoiceBody(),
    ),
  );
  if (ok == true) {
    ref.invalidate(purchaseDashboardProvider);
    for (final s in <String?>[null, 'Paid', 'Pending', 'Overdue', 'Draft']) {
      ref.invalidate(purchaseInvoicesProvider(s));
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invoice created as draft')),
      );
    }
  }
}

class _PurchaseCreateInvoiceBody extends ConsumerStatefulWidget {
  const _PurchaseCreateInvoiceBody();

  @override
  ConsumerState<_PurchaseCreateInvoiceBody> createState() =>
      _PurchaseCreateInvoiceBodyState();
}

class _PurchaseCreateInvoiceBodyState
    extends ConsumerState<_PurchaseCreateInvoiceBody> {
  List<Client> _clients = [];
  List<Map<String, dynamic>> _stock = [];
  bool _loadingClients = true;
  bool _loadingStock = true;
  int? _clientId;
  final _items = <_LineItem>[_LineItem()];
  final _tax = TextEditingController(text: '0');
  final _discount = TextEditingController(text: '0');
  final _dueDays = TextEditingController(text: '30');
  final _notes = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadClients();
    _loadStock();
  }

  Future<void> _loadClients() async {
    try {
      final list =
          await ref.read(clientRepositoryProvider).getClients(limit: 500);
      if (mounted) {
        setState(() {
          _clients = list;
          _loadingClients = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingClients = false);
    }
  }

  Future<void> _loadStock() async {
    try {
      final r = await ref.read(apiClientProvider).get(
        ApiEndpoints.inventory,
        queryParameters: {
          'limit': 500,
          'in_stock_only': true,
        },
      );
      final raw = r.data;
      final list = raw is List
          ? raw
          : List<dynamic>.from(raw['items'] ?? []);
      if (mounted) {
        setState(() {
          _stock = List<Map<String, dynamic>>.from(list);
          _loadingStock = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingStock = false);
    }
  }

  Map<String, dynamic>? _stockRow(int? id) {
    if (id == null) return null;
    for (final s in _stock) {
      if (s['id'] == id) return s;
    }
    return null;
  }

  /// Same rule as web `CreateOrderModal.validateStockLimits`.
  int _reservedQtyForStock(int stockId, int excludeIndex) {
    var sum = 0;
    for (var i = 0; i < _items.length; i++) {
      if (i == excludeIndex) continue;
      final row = _items[i];
      if (row.stockItemId != stockId) continue;
      sum += int.tryParse(row.quantity.text.trim()) ?? 0;
    }
    return sum;
  }

  String? _validateStockLimits() {
    for (var i = 0; i < _items.length; i++) {
      final row = _items[i];
      final sid = row.stockItemId;
      if (sid == null) continue;
      final st = _stockRow(sid);
      if (st == null) continue;
      final avail = (st['quantity'] as num?)?.toInt() ?? 0;
      final q = int.tryParse(row.quantity.text.trim()) ?? 0;
      final reserved = _reservedQtyForStock(sid, i);
      if (q + reserved > avail) {
        final name = st['name']?.toString() ?? 'item';
        return 'Insufficient stock for "$name". Available: $avail, requested total: ${q + reserved}.';
      }
    }
    return null;
  }

  @override
  void dispose() {
    for (final i in _items) {
      i.dispose();
    }
    _tax.dispose();
    _discount.dispose();
    _dueDays.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_clientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a client')),
      );
      return;
    }
    final stockErr = _validateStockLimits();
    if (stockErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(stockErr)),
      );
      return;
    }
    final bodyItems = <Map<String, dynamic>>[];
    for (final row in _items) {
      final desc = row.description.text.trim();
      if (desc.isEmpty) continue;
      final q = int.tryParse(row.quantity.text.trim()) ?? 0;
      final up = double.tryParse(row.unitPrice.text.trim()) ?? 0;
      if (q <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Quantity must be positive')),
        );
        return;
      }
      // Backend `InvoiceItemCreate` stores description/qty/price only; catalog
      // selection is for UX + validation (matches web).
      bodyItems.add({
        'description': desc,
        'quantity': q,
        'unit_price': up,
      });
    }
    if (bodyItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one line item')),
      );
      return;
    }

    final tax = double.tryParse(_tax.text.trim()) ?? 0;
    final discount = double.tryParse(_discount.text.trim()) ?? 0;
    final dueDays = int.tryParse(_dueDays.text.trim()) ?? 30;

    setState(() => _submitting = true);
    try {
      await ref.read(purchaseRepositoryProvider).createInvoice(
            clientId: _clientId!,
            items: bodyItems,
            tax: tax,
            discount: discount,
            notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
            dueDays: dueDays,
          );
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _onStockPicked(_LineItem row, int? id) {
    setState(() {
      row.stockItemId = id;
      if (id != null) {
        final st = _stockRow(id);
        if (st != null) {
          row.description.text = st['name']?.toString() ?? '';
          row.unitPrice.text =
              ((st['unit_price'] as num?) ?? 0).toString();
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final loading = _loadingClients || _loadingStock;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'New invoice',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Pick stock items or enter manual lines. Stock totals are validated like the web app.',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            if (loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              )
            else ...[
              DropdownButtonFormField<int?>(
                value: _clientId,
                decoration: const InputDecoration(
                  labelText: 'Client',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('Select a client…'),
                  ),
                  ..._clients.map((c) => DropdownMenuItem<int?>(
                        value: c.id,
                        child: Text(
                          c.company != null && c.company!.isNotEmpty
                              ? '${c.name} (${c.company})'
                              : c.name,
                          overflow: TextOverflow.ellipsis,
                        ),
                      )),
                ],
                onChanged: (v) => setState(() => _clientId = v),
              ),
              const SizedBox(height: 16),
              const Text('Line items',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ...List.generate(_items.length, (index) {
                final row = _items[index];
                final st = _stockRow(row.stockItemId);
                final avail = st != null
                    ? (st['quantity'] as num?)?.toInt() ?? 0
                    : null;
                final reserved = row.stockItemId != null
                    ? _reservedQtyForStock(row.stockItemId!, index)
                    : 0;
                return Padding(
                  key: ValueKey('line_$index'),
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color:
                            Theme.of(context).dividerColor.withOpacity(0.15),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        DropdownButtonFormField<int?>(
                          value: row.stockItemId,
                          decoration: const InputDecoration(
                            labelText: 'Catalog (optional)',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          isExpanded: true,
                          items: [
                            const DropdownMenuItem<int?>(
                              value: null,
                              child: Text('Manual line'),
                            ),
                            ..._stock.map((s) {
                              final id = s['id'] as int;
                              final q = (s['quantity'] as num?)?.toInt() ?? 0;
                              final name = s['name']?.toString() ?? '';
                              return DropdownMenuItem<int?>(
                                value: id,
                                child: Text(
                                  '$name · avail $q',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }),
                          ],
                          onChanged: (v) => _onStockPicked(row, v),
                        ),
                        if (row.stockItemId != null && avail != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'This row: qty ${int.tryParse(row.quantity.text.trim()) ?? 0} · '
                            'Other rows same SKU: $reserved · Available: $avail',
                            style: const TextStyle(
                                fontSize: 10, color: AppColors.textMuted),
                          ),
                        ],
                        const SizedBox(height: 8),
                        TextField(
                          controller: row.description,
                          decoration: const InputDecoration(
                            labelText: 'Description',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            SizedBox(
                              width: 72,
                              child: TextField(
                                controller: row.quantity,
                                keyboardType: TextInputType.number,
                                onChanged: (_) => setState(() {}),
                                decoration: const InputDecoration(
                                  labelText: 'Qty',
                                  border: OutlineInputBorder(),
                                  isDense: true,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: row.unitPrice,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                decoration: const InputDecoration(
                                  labelText: 'Unit price',
                                  border: OutlineInputBorder(),
                                  isDense: true,
                                ),
                              ),
                            ),
                            if (_items.length > 1)
                              IconButton(
                                onPressed: () {
                                  setState(() {
                                    row.dispose();
                                    _items.removeAt(index);
                                  });
                                },
                                icon: const Icon(Icons.remove_circle_outline,
                                    color: AppColors.error),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => setState(() => _items.add(_LineItem())),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Add line'),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _tax,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Tax',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _discount,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Discount',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _dueDays,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Due days',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _notes,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create draft'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
