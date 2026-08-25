import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';

class TwoFactorSettingsScreen extends ConsumerStatefulWidget {
  const TwoFactorSettingsScreen({super.key});

  @override
  ConsumerState<TwoFactorSettingsScreen> createState() => _TwoFactorSettingsScreenState();
}

class _TwoFactorSettingsScreenState extends ConsumerState<TwoFactorSettingsScreen> {
  bool _loading = true;
  bool _enabled = false;
  String? _error;
  String? _secret;
  String? _otpauth;
  List<String>? _recovery;
  final _codeCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref.read(authRepositoryProvider).twoFactorStatus();
      setState(() {
        _enabled = data['enabled'] == true;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Could not load 2FA status.';
        _loading = false;
      });
    }
  }

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await ref.read(authRepositoryProvider).twoFactorSetup();
      setState(() {
        _secret = data['secret'] as String?;
        _otpauth = data['otpauth_uri'] as String?;
      });
    } catch (_) {
      setState(() => _error = 'Could not start setup.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final code = _codeCtrl.text.trim();
    setState(() => _busy = true);
    try {
      final codes = await ref.read(authRepositoryProvider).twoFactorConfirm(code: code);
      setState(() {
        _recovery = codes;
        _enabled = true;
        _secret = null;
      });
    } catch (_) {
      setState(() => _error = 'Invalid code.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _disable() async {
    setState(() => _busy = true);
    try {
      await ref.read(authRepositoryProvider).twoFactorDisable(_passwordCtrl.text);
      _passwordCtrl.clear();
      setState(() {
        _enabled = false;
        _recovery = null;
      });
    } catch (_) {
      setState(() => _error = 'Could not disable 2FA. Check password, or company mandate.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Two-factor authentication')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!, style: const TextStyle(color: AppColors.error)),
                  ),
                Text(_enabled ? '2FA is on for this account.' : '2FA is off.'),
                const SizedBox(height: 16),
                if (_recovery != null) ...[
                  const Text('Save these recovery codes:'),
                  SelectableText(_recovery!.join('\n')),
                  const SizedBox(height: 16),
                ],
                if (_enabled) ...[
                  TextField(
                    controller: _passwordCtrl,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Password to disable'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _busy ? null : _disable,
                    child: const Text('Disable 2FA'),
                  ),
                ] else if (_secret != null) ...[
                  SelectableText(_secret!, style: const TextStyle(fontFamily: 'monospace')),
                  TextButton(
                    onPressed: () => Clipboard.setData(ClipboardData(text: _secret!)),
                    child: const Text('Copy secret'),
                  ),
                  if (_otpauth != null) SelectableText(_otpauth!, style: const TextStyle(fontSize: 12)),
                  TextField(
                    controller: _codeCtrl,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(labelText: 'Confirm code', counterText: ''),
                  ),
                  FilledButton(onPressed: _busy ? null : _confirm, child: const Text('Confirm')),
                ] else
                  FilledButton(
                    onPressed: _busy ? null : _start,
                    child: const Text('Enable 2FA'),
                  ),
              ],
            ),
    );
  }
}
