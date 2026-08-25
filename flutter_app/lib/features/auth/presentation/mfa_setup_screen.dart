import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

class MfaSetupScreen extends ConsumerStatefulWidget {
  const MfaSetupScreen({super.key});

  @override
  ConsumerState<MfaSetupScreen> createState() => _MfaSetupScreenState();
}

class _MfaSetupScreenState extends ConsumerState<MfaSetupScreen> {
  final _codeCtrl = TextEditingController();
  String? _secret;
  String? _otpauth;
  List<String>? _recovery;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final token = ref.read(authProvider).setupToken;
      final data = await ref.read(authRepositoryProvider).twoFactorSetup(setupToken: token);
      setState(() {
        _secret = data['secret'] as String?;
        _otpauth = data['otpauth_uri'] as String?;
      });
    } catch (e) {
      setState(() => _error = 'Could not start 2FA setup.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final code = _codeCtrl.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter a 6-digit code');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final token = ref.read(authProvider).setupToken;
      final codes = await ref.read(authRepositoryProvider).twoFactorConfirm(
            code: code,
            setupToken: token,
          );
      setState(() => _recovery = codes);
    } catch (e) {
      setState(() => _error = 'Invalid code. Try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  void _done() {
    ref.read(authProvider.notifier).cancelMfa();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enable two-factor'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _done,
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: AppColors.error)),
              ),
            if (_recovery != null) ...[
              const Text(
                'Save these recovery codes. You will not see them again. Then sign in with your authenticator.',
              ),
              const SizedBox(height: 12),
              SelectableText(_recovery!.join('\n'), style: const TextStyle(fontFamily: 'monospace')),
              const SizedBox(height: 20),
              FilledButton(onPressed: _done, child: const Text('Back to sign in')),
            ] else if (_secret == null) ...[
              const Text('Your company requires two-factor authentication before you can sign in.'),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _start,
                child: _busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Generate secret'),
              ),
            ] else ...[
              const Text('Add this secret to Google Authenticator or any TOTP app, then enter a code.'),
              const SizedBox(height: 12),
              SelectableText(_secret!, style: const TextStyle(fontFamily: 'monospace', letterSpacing: 1.2)),
              TextButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: _secret!));
                },
                child: const Text('Copy secret'),
              ),
              if (_otpauth != null) ...[
                const SizedBox(height: 8),
                SelectableText(_otpauth!, style: const TextStyle(fontSize: 12)),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(labelText: '6-digit code', counterText: ''),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _busy ? null : _confirm,
                child: const Text('Confirm'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
