import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/lead.dart';
import 'package:perioxia_crm/features/leads/providers/leads_provider.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';
import 'package:perioxia_crm/shared/widgets/status_badge.dart';
import 'package:perioxia_crm/shared/sheets/create_lead_sheet.dart';

class LeadsListScreen extends ConsumerStatefulWidget {
  const LeadsListScreen({super.key});

  @override
  ConsumerState<LeadsListScreen> createState() => _LeadsListScreenState();
}

class _LeadsListScreenState extends ConsumerState<LeadsListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _search = '';

  static const _tabs = ['All', 'Active', 'Converted', 'Lost'];

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

  String? get _statusFilter {
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

  @override
  Widget build(BuildContext context) {
    final leadsAsync = ref.watch(leadsProvider(null));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabCtrl,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
          indicatorSize: TabBarIndicatorSize.label,
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
          builder: (_) => CreateLeadSheet(
            onCreated: () => ref.invalidate(leadsProvider(null)),
          ),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Add Lead'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search leads...',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          Expanded(
            child: leadsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorBanner(
                message: 'Failed to load leads',
                onRetry: () => ref.invalidate(leadsProvider(null)),
              ),
              data: (allLeads) {
                var leads = allLeads;
                final statusF = _statusFilter;

                if (statusF != null) {
                  if (statusF == 'Active') {
                    leads = leads
                        .where((l) =>
                            !['converted', 'lost']
                                .contains(l.status.toLowerCase()))
                        .toList();
                  } else {
                    leads = leads
                        .where((l) =>
                            l.status.toLowerCase() == statusF.toLowerCase())
                        .toList();
                  }
                }

                if (_search.isNotEmpty) {
                  leads = leads
                      .where((l) =>
                          l.name.toLowerCase().contains(_search) ||
                          (l.email?.toLowerCase().contains(_search) ?? false) ||
                          (l.company?.toLowerCase().contains(_search) ?? false))
                      .toList();
                }

                if (leads.isEmpty) {
                  return const EmptyState(
                    icon: Icons.person_search,
                    title: 'No leads found',
                    subtitle: 'Try changing your filters or add a new lead',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(leadsProvider(null)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                    itemCount: leads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final lead = leads[i];
                      return _LeadCard(
                        lead: lead,
                        onTap: () => context.push('/leads/${lead.id}'),
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

class _LeadCard extends StatelessWidget {
  final Lead lead;
  final VoidCallback onTap;

  const _LeadCard({required this.lead, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
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
            CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.primary.withOpacity(0.1),
              child: Text(
                lead.name.isNotEmpty ? lead.name[0].toUpperCase() : '?',
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(lead.name,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  if (lead.company != null)
                    Text(lead.company!,
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                ],
              ),
            ),
            StatusBadge(label: lead.status),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
