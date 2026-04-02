import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

final _stockProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.read(apiClientProvider);
  final response =
      await api.get(ApiEndpoints.inventory, queryParameters: {'limit': 500});
  final raw = response.data;
  if (raw is List) return List<Map<String, dynamic>>.from(raw);
  return List<Map<String, dynamic>>.from(raw['items'] ?? []);
});

class StockScreen extends ConsumerStatefulWidget {
  const StockScreen({super.key});

  @override
  ConsumerState<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends ConsumerState<StockScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final stockAsync = ref.watch(_stockProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock / Inventory',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add),
      ),
      body: stockAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load inventory',
          onRetry: () => ref.invalidate(_stockProvider),
        ),
        data: (allItems) {
          final items = _search.isEmpty
              ? allItems
              : allItems
                  .where((i) =>
                      (i['name']?.toString().toLowerCase().contains(_search) ??
                          false) ||
                      (i['sku']?.toString().toLowerCase().contains(_search) ??
                          false))
                  .toList();

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                child: TextField(
                  onChanged: (v) =>
                      setState(() => _search = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search items...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              Expanded(
                child: items.isEmpty
                    ? const EmptyState(
                        icon: Icons.inventory_2_outlined,
                        title: 'No inventory items',
                      )
                    : RefreshIndicator(
                        onRefresh: () async =>
                            ref.invalidate(_stockProvider),
                        child: ListView.separated(
                          padding:
                              const EdgeInsets.fromLTRB(16, 8, 16, 80),
                          itemCount: items.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final item = items[i];
                            return _StockCard(
                              item: item,
                              onAdjust: () =>
                                  _showAdjustDialog(context, item),
                            );
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final skuCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '0');
    final priceCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add Inventory Item',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                  labelText: 'Item Name *',
                  prefixIcon: Icon(Icons.inventory_2_outlined, size: 20)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: skuCtrl,
              decoration: const InputDecoration(
                  labelText: 'SKU',
                  prefixIcon: Icon(Icons.qr_code, size: 20)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Quantity',
                        prefixIcon: Icon(Icons.numbers, size: 20)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: priceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Unit Price',
                        prefixIcon: Icon(Icons.attach_money, size: 20)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  final api = ref.read(apiClientProvider);
                  await api.post(ApiEndpoints.inventory, data: {
                    'name': nameCtrl.text.trim(),
                    if (skuCtrl.text.trim().isNotEmpty)
                      'sku': skuCtrl.text.trim(),
                    'quantity':
                        int.tryParse(qtyCtrl.text) ?? 0,
                    if (priceCtrl.text.trim().isNotEmpty)
                      'unit_price':
                          double.tryParse(priceCtrl.text) ?? 0,
                  });
                  ref.invalidate(_stockProvider);
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Add Item'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAdjustDialog(
      BuildContext context, Map<String, dynamic> item) {
    final adjustCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Adjust: ${item['name']}',
            style:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Current quantity: ${item['quantity'] ?? 0}',
                style: TextStyle(
                    fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: adjustCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(signed: true),
              decoration: const InputDecoration(
                labelText: 'Quantity change (e.g. +5 or -3)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final change = int.tryParse(adjustCtrl.text);
              if (change == null) return;
              Navigator.pop(ctx);
              final api = ref.read(apiClientProvider);
              final id = item['id'];
              await api.post(ApiEndpoints.inventoryAdjust(id),
                  data: {'quantity_change': change});
              ref.invalidate(_stockProvider);
            },
            child: const Text('Adjust'),
          ),
        ],
      ),
    );
  }
}

class _StockCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onAdjust;

  const _StockCard({required this.item, required this.onAdjust});

  @override
  Widget build(BuildContext context) {
    final qty = item['quantity'] ?? 0;
    final low = (qty is num) && qty < 10;

    return GestureDetector(
      onTap: onAdjust,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: low
                ? AppColors.warning.withOpacity(0.3)
                : Theme.of(context).dividerColor.withOpacity(0.12),
          ),
        ),
        child: Row(
          children: [
            Icon(Icons.inventory_2_outlined,
                color: low ? AppColors.warning : AppColors.textMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['name'] ?? 'Unknown',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  if (item['sku'] != null)
                    Text('SKU: ${item['sku']}',
                        style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('$qty',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: low
                            ? AppColors.warning
                            : AppColors.textPrimary)),
                if (low)
                  Text('Low stock',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.warning)),
              ],
            ),
            const SizedBox(width: 8),
            Icon(Icons.tune, size: 16, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
