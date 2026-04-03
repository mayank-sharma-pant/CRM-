import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

/// Lets a platform admin obtain a platform JWT after OTP (or missing token) by re-entering password.
Future<void> showPlatformTokenExchangeDialog(BuildContext context) async {
  await showDialog<void>(
    context: context,
    builder: (_) => const _PlatformTokenExchangeDialogBody(),
  );
}

class _PlatformTokenExchangeDialogBody extends ConsumerStatefulWidget {
  const _PlatformTokenExchangeDialogBody();

  @override
  ConsumerState<_PlatformTokenExchangeDialogBody> createState() =>
      _PlatformTokenExchangeDialogBodyState();
}

class _PlatformTokenExchangeDialogBodyState
    extends ConsumerState<_PlatformTokenExchangeDialogBody> {
  final _pw = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _pw.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Platform API access'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Enter your account password to store a platform token. '
            'Use this if you signed in with a one-time code.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _pw,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Password',
            ),
            onSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.error, fontSize: 13)),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Continue'),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _busy = true;
    });
    final msg = await ref
        .read(authProvider.notifier)
        .exchangePlatformTokenWithPassword(_pw.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (msg == null) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Platform access enabled')),
      );
    } else {
      setState(() => _error = msg);
    }
  }
}
