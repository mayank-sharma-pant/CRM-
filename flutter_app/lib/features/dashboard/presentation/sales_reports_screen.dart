import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/dashboard/providers/dashboard_provider.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

/// Sales analytics from `GET /leads/dashboard` — lighter counterpart to web `/sales/reports`.
class SalesReportsScreen extends ConsumerWidget {
  const SalesReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Reports',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load report data',
          onRetry: () => ref.invalidate(dashboardProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Based on your dashboard snapshot (same source as the web reports page).',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              _SectionTitle('Leads by status'),
              const SizedBox(height: 10),
              if (data.leadsByStatus.isEmpty)
                Text('No pipeline data',
                    style: TextStyle(color: AppColors.textMuted))
              else
                _StatusWrap(items: data.leadsByStatus),
              const SizedBox(height: 24),
              _SectionTitle('Leads by source'),
              const SizedBox(height: 10),
              if (data.leadsBySource.isEmpty)
                Text('No source breakdown',
                    style: TextStyle(color: AppColors.textMuted))
              else
                _SourceBars(items: data.leadsBySource),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: const TextStyle(
            fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.2));
  }
}

class _StatusWrap extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  const _StatusWrap({required this.items});

  static const _colors = {
    'New': AppColors.info,
    'Contacted': AppColors.primary,
    'Active': AppColors.accent,
    'Qualified': AppColors.accent,
    'Proposal': AppColors.warning,
    'Converted': AppColors.success,
    'Lost': AppColors.error,
  };

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items.map((item) {
        final status = item['status']?.toString() ?? 'Unknown';
        final count = item['count'] ?? 0;
        final color = _colors[status] ?? AppColors.textMuted;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration:
                    BoxDecoration(shape: BoxShape.circle, color: color),
              ),
              const SizedBox(width: 8),
              Text('$status: ',
                  style: TextStyle(fontSize: 12, color: color)),
              Text('$count',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: color)),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _SourceBars extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  const _SourceBars({required this.items});

  @override
  Widget build(BuildContext context) {
    final total = items.fold<int>(
        0, (s, m) => s + ((m['count'] as num?)?.toInt() ?? 0));
    if (total <= 0) {
      return Text('No counts', style: TextStyle(color: AppColors.textMuted));
    }
    return Column(
      children: items.map((m) {
        final label = m['source']?.toString() ?? 'Unknown';
        final count = (m['count'] as num?)?.toInt() ?? 0;
        final frac = count / total;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(label,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                  Text('$count',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary)),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: frac.clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor:
                      Theme.of(context).dividerColor.withOpacity(0.12),
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.primary.withOpacity(0.85)),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
