import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';

final _ordersProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get(ApiEndpoints.invoices);
  final raw = response.data;
  return invoiceItemsFromResponse(raw);
});

final _currFmt = NumberFormat.compactCurrency(symbol: '₹', decimalDigits: 0);

class OrdersScreen extends ConsumerStatefulWidget {
  /// Web `/sales/orders` title: "My Sourced Orders". Default matches legacy `/orders` route.
  final String appBarTitle;

  const OrdersScreen({super.key, this.appBarTitle = 'My Orders'});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _search = '';

  static const _tabs = ['All', 'Draft', 'Pending', 'Paid'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(_ordersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.appBarTitle,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabCtrl,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
          indicatorSize: TabBarIndicatorSize.label,
        ),
      ),
      body: ordersAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load orders',
          onRetry: () => ref.invalidate(_ordersProvider),
        ),
        data: (allOrders) {
          // KPI
          final total = allOrders.length;
          final paidCount = allOrders.where((o) =>
              o['status']?.toString().toLowerCase() == 'paid').length;
          final totalAmount = allOrders.fold<double>(
              0, (s, o) => s + ((o['total'] as num?)?.toDouble() ?? 0));

          // Filter
          var orders = allOrders;
          final tab = _tabCtrl.index;
          if (tab > 0) {
            final statusKey = _tabs[tab].toLowerCase();
            orders = orders
                .where((o) =>
                    o['status']?.toString().toLowerCase() == statusKey)
                .toList();
          }
          if (_search.isNotEmpty) {
            orders = orders
                .where((o) =>
                    (o['invoice_number']
                            ?.toString()
                            .toLowerCase()
                            .contains(_search) ??
                        false) ||
                    (o['client']
                            ?.toString()
                            .toLowerCase()
                            .contains(_search) ??
                        false) ||
                    (o['client_name']
                            ?.toString()
                            .toLowerCase()
                            .contains(_search) ??
                        false))
                .toList();
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_ordersProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // KPI strip
                Row(
                  children: [
                    _KpiChip(label: 'Total', value: '$total', color: AppColors.primary),
                    const SizedBox(width: 10),
                    _KpiChip(label: 'Paid', value: '$paidCount', color: AppColors.success),
                    const SizedBox(width: 10),
                    _KpiChip(
                        label: 'Revenue',
                        value: _currFmt.format(totalAmount),
                        color: AppColors.accent),
                  ],
                ),
                const SizedBox(height: 12),

                // Search
                TextField(
                  onChanged: (v) => setState(() => _search = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search by invoice or client...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),

                if (orders.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: EmptyState(
                      icon: Icons.receipt_long_outlined,
                      title: 'No orders found',
                    ),
                  ),

                ...orders.map((inv) => _OrderCard(
                      invoice: inv,
                      onTap: () {
                        final id = inv['id'];
                        if (id != null) context.push('/invoices/$id');
                      },
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _KpiChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _KpiChip(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: color)),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> invoice;
  final VoidCallback onTap;

  const _OrderCard({required this.invoice, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = invoice['status']?.toString() ?? 'draft';
    final isPaid = status.toLowerCase() == 'paid';
    final clientName = invoice['client_name'] ?? invoice['client'] ?? '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: Theme.of(context).dividerColor.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            Icon(
              isPaid ? Icons.check_circle : Icons.receipt_long_outlined,
              color: isPaid ? AppColors.success : AppColors.warning,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                      invoice['invoice_number'] ?? 'INV-${invoice['id'] ?? ''}',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  if (clientName.toString().isNotEmpty)
                    Text(clientName.toString(),
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (invoice['total'] != null)
                  Text(
                      '₹${(invoice['total'] as num).toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700)),
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (isPaid ? AppColors.success : AppColors.warning)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: isPaid ? AppColors.success : AppColors.warning,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
