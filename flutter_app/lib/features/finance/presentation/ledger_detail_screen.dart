import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final _ledgerDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get(ApiEndpoints.ledgerBySlug(slug));
  return Map<String, dynamic>.from(r.data as Map);
});

class LedgerDetailScreen extends ConsumerWidget {
  final String slug;

  const LedgerDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_ledgerDetailProvider(slug));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: async.when(
          data: (d) => Text(d['ledger_name']?.toString() ?? slug),
          loading: () => const Text('Ledger'),
          error: (_, __) => const Text('Ledger'),
        ),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load ledger',
          onRetry: () => ref.invalidate(_ledgerDetailProvider(slug)),
        ),
        data: (data) {
          final columns =
              List<Map<String, dynamic>>.from(data['columns'] ?? []);
          final rows =
              List<Map<String, dynamic>>.from(data['rows'] ?? []);
          final keys = columns.isNotEmpty
              ? columns.map((c) => c['key']?.toString()).whereType<String>().toList()
              : (rows.isNotEmpty ? rows.first.keys.toList() : <String>[]);

          if (rows.isEmpty) {
            return Center(
              child: Text('No entries yet',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }

          return LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints:
                      BoxConstraints(minWidth: constraints.maxWidth),
                  child: SingleChildScrollView(
                    child: DataTable(
                      headingRowColor: WidgetStateProperty.all(
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                      ),
                      columns: keys
                          .map((k) => DataColumn(
                                label: Text(
                                  _labelForKey(columns, k),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700),
                                ),
                              ))
                          .toList(),
                      rows: rows.map((row) {
                        return DataRow(
                          cells: keys
                              .map((k) => DataCell(Text(
                                    _formatCell(row[k]),
                                  )))
                              .toList(),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _labelForKey(List<Map<String, dynamic>> columns, String key) {
    for (final c in columns) {
      if (c['key'] == key) return c['label']?.toString() ?? key;
    }
    return key;
  }

  String _formatCell(dynamic v) {
    if (v == null) return '—';
    if (v is Map || v is List) return v.toString();
    return v.toString();
  }
}
