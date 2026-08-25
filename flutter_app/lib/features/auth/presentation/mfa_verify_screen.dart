import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

class MfaVerifyScreen extends ConsumerStatefulWidget {
  const MfaVerifyScreen({super.key});

  @override
  ConsumerState<MfaVerifyScreen> createState() => _MfaVerifyScreenState();
}

class _MfaVerifyScreenState extends ConsumerState<MfaVerifyScreen> {
  final _codeCtrl = TextEditingController();
  bool _recovery = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _codeCtrl.text.trim();
    if (code.isEmpty) return;
    await ref.read(authProvider.notifier).verifyMfa(code);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final loading = auth.status == AuthStatus.loading;

    ref.listen<AuthState>(authProvider, (_, next) {
      if (next.status == AuthStatus.authenticated) {
        context.go(homePathForUser(next.user));
      }
      if (next.status == AuthStatus.unauthenticated) {
        context.go('/login');
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Two-factor'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            ref.read(authProvider.notifier).cancelMfa();
            context.go('/login');
          },
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _recovery
                    ? 'Enter a recovery code'
                    : 'Enter the 6-digit code from your authenticator app',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              if (auth.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(auth.error!, style: const TextStyle(color: AppColors.error)),
                ),
              TextField(
                controller: _codeCtrl,
                autofocus: true,
                keyboardType: _recovery ? TextInputType.text : TextInputType.number,
                textCapitalization: TextCapitalization.characters,
                maxLength: _recovery ? 12 : 6,
                decoration: InputDecoration(
                  labelText: _recovery ? 'Recovery code' : 'Authentication code',
                  counterText: '',
                ),
                onSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: loading ? null : _submit,
                child: loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Verify'),
              ),
              TextButton(
                onPressed: () => setState(() => _recovery = !_recovery),
                child: Text(_recovery ? 'Use an authenticator code' : 'Use a recovery code'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
