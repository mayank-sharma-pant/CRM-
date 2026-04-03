import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

final _notificationPrefsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get(ApiEndpoints.notificationPreferences);
  return Map<String, dynamic>.from(r.data as Map);
});

class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_notificationPrefsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Notification categories'),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load preferences',
          onRetry: () => ref.invalidate(_notificationPrefsProvider),
        ),
        data: (data) {
          final available =
              List<String>.from(data['available_categories'] ?? []);
          final muted = Set<String>.from(
            (data['muted_categories'] as List?)?.map((e) => e.toString()) ??
                [],
          );

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Turn off categories you do not want in your notification feed. “General” cannot be muted.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              ...available.where((c) => c != 'general').map((c) {
                final isMuted = muted.contains(c);
                return SwitchListTile(
                  title: Text(_label(c)),
                  subtitle: Text(
                    isMuted ? 'Muted' : 'On',
                    style: TextStyle(
                        fontSize: 12,
                        color: isMuted ? AppColors.textMuted : AppColors.success),
                  ),
                  value: !isMuted,
                  onChanged: (enabled) async {
                    final next = Set<String>.from(muted);
                    if (enabled) {
                      next.remove(c);
                    } else {
                      next.add(c);
                    }
                    try {
                      final api = ref.read(apiClientProvider);
                      await api.put(
                        ApiEndpoints.notificationPreferences,
                        data: {'muted_categories': next.toList()},
                      );
                      ref.invalidate(_notificationPrefsProvider);
                    } on DioException catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(
                                  ApiException.fromDioError(e).message)),
                        );
                      }
                    }
                  },
                );
              }),
            ],
          );
        },
      ),
    );
  }

  String _label(String c) {
    return c[0].toUpperCase() + c.substring(1);
  }
}
