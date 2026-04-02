import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';
import 'package:perioxia_crm/shared/widgets/status_badge.dart';

class ManagerLeadsListScreen extends ConsumerStatefulWidget {
  const ManagerLeadsListScreen({super.key});

  @override
  ConsumerState<ManagerLeadsListScreen> createState() =>
      _ManagerLeadsListScreenState();
}

class _ManagerLeadsListScreenState extends ConsumerState<ManagerLeadsListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  int? _memberIdFilter;
  String _search = '';
  late Future<Map<String, dynamic>> _leadsFuture;
  List<Map<String, dynamic>> _teamRoster = [];

  static const _tabs = ['All', 'Active', 'Converted', 'Lost'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _tabCtrl.addListener(_onTab);
    _leadsFuture = _fetchLeads();
    _loadTeam();
  }

  void _onTab() {
    if (!_tabCtrl.indexIsChanging) _reloadLeads();
  }

  @override
  void dispose() {
    _tabCtrl.removeListener(_onTab);
    _tabCtrl.dispose();
    super.dispose();
  }

  String? get _statusParam {
    switch (_tabCtrl.index) {
      case 1:
        return 'Active';
      case 2:
        return 'Converted';
      case 3:
        return 'Lost';
      default:
        return null;
    }
  }

  Future<Map<String, dynamic>> _fetchLeads() {
    return ref.read(managerRepositoryProvider).getTeamLeads(
          status: _statusParam,
          memberId: _memberIdFilter,
          limit: 300,
        );
  }

  Future<void> _loadTeam() async {
    try {
      final t = await ref.read(managerRepositoryProvider).getTeam();
      if (mounted) {
        setState(() {
          _teamRoster = List<Map<String, dynamic>>.from(t['team'] ?? []);
        });
      }
    } catch (_) {}
  }

  void _reloadLeads() {
    setState(() => _leadsFuture = _fetchLeads());
  }

  Future<void> _reassign(int leadId, int? currentAssigneeId) async {
    int? pick = currentAssigneeId;
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          title: const Text('Reassign lead'),
          content: DropdownButtonFormField<int>(
            value: pick,
            items: _teamRoster
                .map((m) => DropdownMenuItem(
                      value: m['id'] as int,
                      child: Text(m['full_name']?.toString() ?? ''),
                    ))
                .toList(),
            onChanged: (v) => setSt(() => pick = v),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (pick == null) return;
                await ref
                    .read(managerRepositoryProvider)
                    .reassignLead(leadId, pick!);
                if (ctx.mounted) Navigator.pop(ctx);
                _reloadLeads();
              },
              child: const Text('Reassign'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team Leads',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabCtrl,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) =>
                      setState(() => _search = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search name, company, assignee...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<int?>(
                  value: _memberIdFilter,
                  decoration: const InputDecoration(
                    labelText: 'Filter by rep',
                    isDense: true,
                  ),
                  items: [
                    const DropdownMenuItem<int?>(
                      value: null,
                      child: Text('All reps'),
                    ),
                    ..._teamRoster.map((m) => DropdownMenuItem<int?>(
                          value: m['id'] as int?,
                          child:
                              Text(m['full_name']?.toString() ?? ''),
                        )),
                  ],
                  onChanged: (v) {
                    setState(() {
                      _memberIdFilter = v;
                      _leadsFuture = _fetchLeads();
                    });
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<Map<String, dynamic>>(
              future: _leadsFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const LoadingIndicator();
                }
                if (snap.hasError) {
                  return ErrorBanner(
                    message: 'Failed to load team leads',
                    onRetry: _reloadLeads,
                  );
                }
                var leads =
                    List<Map<String, dynamic>>.from(snap.data?['leads'] ?? []);

                if (_search.isNotEmpty) {
                  leads = leads
                      .where((l) =>
                          (l['name']
                                  ?.toString()
                                  .toLowerCase()
                                  .contains(_search) ??
                              false) ||
                          (l['company']
                                  ?.toString()
                                  .toLowerCase()
                                  .contains(_search) ??
                              false) ||
                          (l['assigned_to']
                                  ?.toString()
                                  .toLowerCase()
                                  .contains(_search) ??
                              false))
                      .toList();
                }

                if (leads.isEmpty) {
                  return const EmptyState(
                    icon: Icons.people_outline,
                    title: 'No leads',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    final f = _fetchLeads();
                    setState(() => _leadsFuture = f);
                    await f;
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: leads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final lead = leads[i];
                      final id = lead['id'] as int;
                      final aid = lead['assigned_to_id'] as int?;
                      return _LeadRow(
                        lead: lead,
                        onOpen: () => context.push('/leads/$id'),
                        onReassign: () => _reassign(id, aid),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LeadRow extends StatelessWidget {
  final Map<String, dynamic> lead;
  final VoidCallback onOpen;
  final VoidCallback onReassign;

  const _LeadRow({
    required this.lead,
    required this.onOpen,
    required this.onReassign,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onOpen,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: Theme.of(context).dividerColor.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(lead['name']?.toString() ?? '',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  if (lead['company'] != null)
                    Text(lead['company'].toString(),
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 4),
                  Text(
                      'Rep: ${lead['assigned_to'] ?? '—'}',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textMuted)),
                ],
              ),
            ),
            StatusBadge(label: lead['status']?.toString() ?? ''),
            IconButton(
              icon: const Icon(Icons.swap_horiz, size: 20),
              onPressed: onReassign,
              tooltip: 'Reassign',
            ),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
