import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

/// Notifies [GoRouter] when auth state changes so [redirect] runs again.
class GoRouterRefresh extends ChangeNotifier {
  void notifyAuthChanged() => notifyListeners();
}

final goRouterRefreshProvider = Provider<GoRouterRefresh>((ref) {
  final notifier = GoRouterRefresh();
  ref.onDispose(notifier.dispose);
  ref.listen<AuthState>(authProvider, (_, __) => notifier.notifyAuthChanged());
  return notifier;
});
