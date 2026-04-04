import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

const _hiddenKeys = {'id', 'company_id', 'created_at', 'updated_at'};

/// Web routes use kebab-case; API expects snake_case slugs.
String normalizeLedgerSlug(String slug) => slug.replaceAll('-', '_');

final _ledgerDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get(ApiEndpoints.ledgerBySlug(slug));
  final data = r.data;
  if (data is! Map) {
    throw StateError('Invalid ledger response');
  }
  return Map<String, dynamic>.from(data);
});

String _ledgerLoadMessage(Object e) {
  if (e is DioException) {
    final code = e.response?.statusCode;
    if (code == 403) {
      return 'You do not have permission to view this ledger.';
    }
    if (code == 404) {
      return 'Ledger not found.';
    }
    final d = e.response?.data;
    if (d is Map && d['detail'] != null) {
      final det = d['detail'];
      if (det is List) {
        return det.map((x) => x.toString()).join(', ');
      }
      return det.toString();
    }
  }
  return 'Failed to load ledger';
}

class LedgerDetailScreen extends ConsumerWidget {
  final String slug;

  const LedgerDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apiSlug = normalizeLedgerSlug(slug);
    final async = ref.watch(_ledgerDetailProvider(apiSlug));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: async.when(
          data: (d) => Text(d['ledger_name']?.toString() ?? apiSlug),
          loading: () => const Text('Ledger'),
          error: (_, __) => const Text('Ledger'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: async.isLoading
                ? null
                : () => ref.invalidate(_ledgerDetailProvider(apiSlug)),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: async.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: _ledgerLoadMessage(e),
                onRetry: () => ref.invalidate(_ledgerDetailProvider(apiSlug)),
              ),
              data: (data) {
                if (data['can_view'] == false) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'Access denied. You do not have permission to view this ledger.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(_ledgerDetailProvider(apiSlug));
                    await ref.read(_ledgerDetailProvider(apiSlug).future);
                  },
                  child: _LedgerDetailBody(
                    slug: apiSlug,
                    data: data,
                    onRefresh: () =>
                        ref.invalidate(_ledgerDetailProvider(apiSlug)),
                  ),
                );
              },
            ),
          ),
          if (async.isRefreshing)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(minHeight: 2),
            ),
        ],
      ),
    );
  }
}

class _LedgerDetailBody extends ConsumerStatefulWidget {
  final String slug;
  final Map<String, dynamic> data;
  final VoidCallback onRefresh;

  const _LedgerDetailBody({
    required this.slug,
    required this.data,
    required this.onRefresh,
  });

  @override
  ConsumerState<_LedgerDetailBody> createState() => _LedgerDetailBodyState();
}

class _LedgerDetailBodyState extends ConsumerState<_LedgerDetailBody> {
  late final TextEditingController _searchController;
  late final TextEditingController _dateFilterController;
  Map<String, TextEditingController>? _newRowControllers;
  _EditingCell? _editing;
  TextEditingController? _editController;
  Object? _savingId;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _dateFilterController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _dateFilterController.dispose();
    _editController?.dispose();
    _disposeNewRowControllers();
    super.dispose();
  }

  void _disposeNewRowControllers() {
    final m = _newRowControllers;
    if (m != null) {
      for (final c in m.values) {
        c.dispose();
      }
    }
    _newRowControllers = null;
  }

  List<Map<String, dynamic>> get _columns {
    final raw = widget.data['columns'];
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  List<Map<String, dynamic>> get _visibleColumns =>
      _columns.where((c) => !_hiddenKeys.contains(c['key']?.toString())).toList();

  List<Map<String, dynamic>> get _rows {
    final raw = widget.data['rows'];
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  bool get _canEdit => widget.data['can_edit'] == true;

  String _dateFilterValue() => _dateFilterController.text.trim();

  List<Map<String, dynamic>> _filteredRows() {
    final rows = _rows;
    final q = _searchController.text.trim().toLowerCase();
    final df = _dateFilterValue();
    return rows.where((row) {
      if (df.isNotEmpty) {
        final d = row['date']?.toString() ?? '';
        if (!d.startsWith(df)) return false;
      }
      if (q.isEmpty) return true;
      return row.entries.any((e) {
        if (_hiddenKeys.contains(e.key)) return false;
        return e.value.toString().toLowerCase().contains(q);
      });
    }).toList();
  }

  String _dioMessage(DioException e) {
    final d = e.response?.data;
    if (d is Map && d['detail'] != null) {
      final det = d['detail'];
      if (det is List) {
        return det.map((x) => x.toString()).join(', ');
      }
      return det.toString();
    }
    return e.message ?? 'Request failed';
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  int _rowId(Map<String, dynamic> row) {
    final id = row['id'];
    if (id is int) return id;
    if (id is num) return id.toInt();
    if (id is String) {
      final p = int.tryParse(id);
      if (p != null) return p;
    }
    throw StateError('Missing entry id');
  }

  Map<String, dynamic> _payloadWithoutMeta(Map<String, dynamic> row) {
    final m = Map<String, dynamic>.from(row);
    for (final k in _hiddenKeys) {
      m.remove(k);
    }
    return m;
  }

  String _todayIso() {
    final n = DateTime.now();
    final y = n.year.toString().padLeft(4, '0');
    final mo = n.month.toString().padLeft(2, '0');
    final d = n.day.toString().padLeft(2, '0');
    return '$y-$mo-$d';
  }

  String _formatCell(dynamic v, Map<String, dynamic> col) {
    if (v == null || v == '') return '—';
    if (col['type'] == 'date' && v != null) {
      final s = v.toString();
      final i = s.indexOf('T');
      return i >= 0 ? s.substring(0, i) : s;
    }
    if (v is Map || v is List) return v.toString();
    return v.toString();
  }

  String _editText(dynamic v, Map<String, dynamic> col) {
    if (v == null) return '';
    if (col['type'] == 'date') {
      final s = v.toString();
      final i = s.indexOf('T');
      return i >= 0 ? s.substring(0, i) : s;
    }
    return v.toString();
  }

  dynamic _coerceForColumn(String raw, Map<String, dynamic> col) {
    final t = col['type']?.toString();
    if (t == 'number') {
      if (raw.isEmpty) return null;
      return num.tryParse(raw) ?? raw;
    }
    if (t == 'date') {
      return raw.isEmpty ? null : raw;
    }
    return raw;
  }

  Future<void> _pickIsoDate(ValueChanged<String> onChosen, String current) async {
    final parsed = DateTime.tryParse(current);
    final initial = parsed ?? DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (d != null && mounted) {
      final y = d.year.toString().padLeft(4, '0');
      final mo = d.month.toString().padLeft(2, '0');
      final day = d.day.toString().padLeft(2, '0');
      onChosen('$y-$mo-$day');
    }
  }

  void _beginEdit(Map<String, dynamic> row, Map<String, dynamic> col) {
    if (!_canEdit) return;
    final key = col['key']?.toString() ?? '';
    if (key.isEmpty) return;
    _editController?.dispose();
    _editController = TextEditingController(
      text: _editText(row[key], col),
    );
    setState(() {
      _editing = _EditingCell(_rowId(row), key);
    });
  }

  void _cancelEdit() {
    _editController?.dispose();
    _editController = null;
    setState(() => _editing = null);
  }

  Future<void> _saveEdit(Map<String, dynamic> row, Map<String, dynamic> col) async {
    if (_editing == null || _editController == null) return;
    final key = col['key']?.toString() ?? '';
    if (key.isEmpty) return;
    final rowId = _rowId(row);
    final next = _coerceForColumn(_editController!.text.trim(), col);
    final prev = row[key];
    if ('$prev' == '$next' || (prev == null && (next == null || next == ''))) {
      _cancelEdit();
      return;
    }

    final api = ref.read(apiClientProvider);
    final payload = _payloadWithoutMeta(row);
    payload[key] = next;

    setState(() => _savingId = rowId);
    try {
      await api.put(
        ApiEndpoints.ledgerEntry(widget.slug, rowId),
        data: {'data': payload},
      );
      _cancelEdit();
      widget.onRefresh();
    } on DioException catch (e) {
      _snack(_dioMessage(e));
    } finally {
      if (mounted) setState(() => _savingId = null);
    }
  }

  void _startNewRow() {
    _disposeNewRowControllers();
    final ctrls = <String, TextEditingController>{};
    for (final c in _visibleColumns) {
      final k = c['key']?.toString() ?? '';
      if (k.isEmpty) continue;
      ctrls[k] = TextEditingController(
        text: c['type'] == 'date' ? _todayIso() : '',
      );
    }
    setState(() => _newRowControllers = ctrls);
  }

  Future<void> _saveNewRow() async {
    final ctrls = _newRowControllers;
    if (ctrls == null || !_canEdit) return;

    final body = <String, dynamic>{};
    for (final c in _visibleColumns) {
      final k = c['key']?.toString() ?? '';
      if (k.isEmpty) continue;
      final raw = ctrls[k]?.text ?? '';
      body[k] = _coerceForColumn(raw, c);
    }

    final api = ref.read(apiClientProvider);
    setState(() => _savingId = 'new');
    try {
      await api.post(
        ApiEndpoints.ledgerBySlug(widget.slug),
        data: {'data': body},
      );
      _disposeNewRowControllers();
      setState(() {});
      widget.onRefresh();
    } on DioException catch (e) {
      _snack(_dioMessage(e));
    } finally {
      if (mounted) setState(() => _savingId = null);
    }
  }

  Future<void> _deleteRow(int rowId) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete entry'),
        content: const Text(
          'Delete this entry? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final api = ref.read(apiClientProvider);
    setState(() => _savingId = rowId);
    try {
      await api.delete(ApiEndpoints.ledgerEntry(widget.slug, rowId));
      widget.onRefresh();
    } on DioException catch (e) {
      _snack(_dioMessage(e));
    } finally {
      if (mounted) setState(() => _savingId = null);
    }
  }

  Widget _buildCell(
    Map<String, dynamic> row,
    Map<String, dynamic> col,
  ) {
    final key = col['key']?.toString() ?? '';
    final rowId = _rowId(row);
    final editing = _editing;
    final isEditing =
        editing != null && editing.rowId == rowId && editing.key == key;
    final isDate = col['type'] == 'date';

    if (_canEdit && isEditing && _editController != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: isDate ? 100 : 120,
            child: TextField(
              controller: _editController,
              autofocus: !isDate,
              readOnly: isDate,
              onTap: isDate
                  ? () => _pickIsoDate((s) {
                        _editController?.text = s;
                      }, _editController!.text)
                  : null,
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                isDense: true,
                border: const OutlineInputBorder(),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                suffixIcon: isDate
                    ? IconButton(
                        icon: const Icon(Icons.calendar_today, size: 18),
                        onPressed: () => _pickIsoDate((s) {
                          _editController?.text = s;
                          setState(() {});
                        }, _editController!.text),
                      )
                    : null,
              ),
              keyboardType: col['type'] == 'number'
                  ? const TextInputType.numberWithOptions(decimal: true)
                  : TextInputType.text,
              inputFormatters: col['type'] == 'number'
                  ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.\-]'))]
                  : null,
              onSubmitted: (_) => _saveEdit(row, col),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.check, size: 18),
            onPressed: () => _saveEdit(row, col),
            tooltip: 'Save',
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: _cancelEdit,
            tooltip: 'Cancel',
          ),
        ],
      );
    }

    final saving = _savingId == rowId;
    final val = row[key];
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _canEdit && !saving ? () => _beginEdit(row, col) : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(
                  _formatCell(val, col),
                  style: TextStyle(
                    fontSize: 13,
                    color:
                        _canEdit ? AppColors.textPrimary : AppColors.textMuted,
                  ),
                ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleColumns;
    final filtered = _filteredRows();
    final hasDateColumn = visible.any((c) => c['key'] == 'date');

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Text(
                    _canEdit
                        ? 'Financial ledger · Edit'
                        : 'Financial ledger · View only',
                    style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      SizedBox(
                        width: 200,
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search…',
                            isDense: true,
                            prefixIcon: const Icon(Icons.search, size: 18),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 8,
                            ),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      if (hasDateColumn)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 130,
                              child: TextField(
                                controller: _dateFilterController,
                                readOnly: true,
                                decoration: InputDecoration(
                                  hintText: 'Date filter',
                                  isDense: true,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 8,
                                  ),
                                ),
                                onTap: () => _pickIsoDate((s) {
                                  _dateFilterController.text = s;
                                  setState(() {});
                                }, _dateFilterController.text),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.calendar_today, size: 20),
                              tooltip: 'Pick date',
                              onPressed: () => _pickIsoDate((s) {
                                _dateFilterController.text = s;
                                setState(() {});
                              }, _dateFilterController.text),
                            ),
                            if (_dateFilterValue().isNotEmpty)
                              IconButton(
                                icon: const Icon(Icons.clear, size: 20),
                                tooltip: 'Clear date filter',
                                onPressed: () {
                                  _dateFilterController.clear();
                                  setState(() {});
                                },
                              ),
                          ],
                        ),
                      if (_canEdit && _newRowControllers == null)
                        FilledButton.icon(
                          onPressed: _savingId != null ? null : _startNewRow,
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Add row'),
                        ),
                    ],
                  ),
                ),
                if (_canEdit && _newRowControllers != null)
                  _buildNewRowCard(visible),
                if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'No column definitions.',
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  )
                else
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SingleChildScrollView(
                      child: DataTable(
                        headingRowColor: WidgetStateProperty.all(
                          Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                        ),
                        columnSpacing: 16,
                        columns: [
                          ...visible.map(
                            (c) => DataColumn(
                              label: Text(
                                c['label']?.toString() ??
                                    c['key']?.toString() ??
                                    '',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                          if (_canEdit)
                            const DataColumn(
                              label: Text(
                                'Actions',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                        ],
                        rows: [
                          if (filtered.isEmpty && _newRowControllers == null)
                            DataRow(
                              cells: [
                                DataCell(
                                  Text(
                                    _rows.isEmpty
                                        ? 'No records.'
                                        : 'No matching records.',
                                    style:
                                        TextStyle(color: AppColors.textMuted),
                                  ),
                                ),
                                ...List.generate(
                                  visible.length - 1,
                                  (_) => const DataCell(SizedBox.shrink()),
                                ),
                                if (_canEdit)
                                  const DataCell(SizedBox.shrink()),
                              ],
                            )
                          else
                            ...filtered.map((row) {
                              return DataRow(
                                cells: [
                                  ...visible.map(
                                    (c) => DataCell(_buildCell(row, c)),
                                  ),
                                  if (_canEdit)
                                    DataCell(
                                      _savingId == _rowId(row)
                                          ? const SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                              ),
                                            )
                                          : IconButton(
                                              icon: const Icon(
                                                Icons.delete_outline,
                                                size: 20,
                                              ),
                                              color: AppColors.textMuted,
                                              onPressed: () =>
                                                  _deleteRow(_rowId(row)),
                                              tooltip: 'Delete',
                                            ),
                                    ),
                                ],
                              );
                            }),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildNewRowCard(List<Map<String, dynamic>> visible) {
    final ctrls = _newRowControllers!;
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'New entry',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            ...visible.map((c) {
              final k = c['key']?.toString() ?? '';
              if (k.isEmpty) return const SizedBox.shrink();
              final t = c['type']?.toString();
              final controller = ctrls[k];
              if (controller == null) return const SizedBox.shrink();
              final isDate = t == 'date';
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: TextField(
                  decoration: InputDecoration(
                    labelText: c['label']?.toString() ?? k,
                    isDense: true,
                    border: const OutlineInputBorder(),
                    suffixIcon: isDate
                        ? IconButton(
                            icon: const Icon(Icons.calendar_today, size: 20),
                            onPressed: () => _pickIsoDate((s) {
                              controller.text = s;
                              setState(() {});
                            }, controller.text),
                          )
                        : null,
                  ),
                  readOnly: isDate,
                  onTap: isDate
                      ? () => _pickIsoDate((s) {
                            controller.text = s;
                            setState(() {});
                          }, controller.text)
                      : null,
                  keyboardType: t == 'number'
                      ? const TextInputType.numberWithOptions(decimal: true)
                      : TextInputType.text,
                  inputFormatters: t == 'number'
                      ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.\-]'))]
                      : null,
                  controller: controller,
                ),
              );
            }),
            Row(
              children: [
                FilledButton(
                  onPressed: _savingId == 'new' ? null : _saveNewRow,
                  child: _savingId == 'new'
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save'),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: _savingId == 'new'
                      ? null
                      : () {
                          setState(_disposeNewRowControllers);
                        },
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EditingCell {
  final int rowId;
  final String key;

  _EditingCell(this.rowId, this.key);
}
