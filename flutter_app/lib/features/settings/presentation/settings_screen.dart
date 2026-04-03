import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _currentPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  bool _changingPw = false;
  String? _pwMessage;
  bool _pwSuccess = false;

  @override
  void dispose() {
    _currentPwCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmPwCtrl.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final current = _currentPwCtrl.text;
    final newPw = _newPwCtrl.text;
    final confirm = _confirmPwCtrl.text;

    if (current.isEmpty || newPw.isEmpty) {
      setState(() {
        _pwMessage = 'All fields are required';
        _pwSuccess = false;
      });
      return;
    }
    if (newPw.length < 8) {
      setState(() {
        _pwMessage = 'New password must be at least 8 characters';
        _pwSuccess = false;
      });
      return;
    }
    if (newPw != confirm) {
      setState(() {
        _pwMessage = 'Passwords do not match';
        _pwSuccess = false;
      });
      return;
    }

    setState(() {
      _changingPw = true;
      _pwMessage = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiEndpoints.changePassword, data: {
        'current_password': current,
        'new_password': newPw,
      });
      setState(() {
        _pwMessage = 'Password changed successfully';
        _pwSuccess = true;
      });
      _currentPwCtrl.clear();
      _newPwCtrl.clear();
      _confirmPwCtrl.clear();
    } on DioException catch (e) {
      final msg = ApiException.fromDioError(e).message;
      setState(() {
        _pwMessage = msg;
        _pwSuccess = false;
      });
    } catch (e) {
      setState(() {
        _pwMessage = 'Failed to change password';
        _pwSuccess = false;
      });
    } finally {
      setState(() => _changingPw = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Change Password',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),

          if (_pwMessage != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: (_pwSuccess ? AppColors.success : AppColors.error)
                    .withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (_pwSuccess ? AppColors.success : AppColors.error)
                      .withOpacity(0.2),
                ),
              ),
              child: Text(
                _pwMessage!,
                style: TextStyle(
                  fontSize: 13,
                  color: _pwSuccess ? AppColors.success : AppColors.error,
                ),
              ),
            ),
          ],

          TextField(
            controller: _currentPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Current Password',
              prefixIcon: Icon(Icons.lock_outline, size: 20),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _newPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'New Password',
              prefixIcon: Icon(Icons.lock_reset, size: 20),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirm New Password',
              prefixIcon: Icon(Icons.lock_reset, size: 20),
            ),
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _changingPw ? null : _changePassword,
              child: _changingPw
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Update Password'),
            ),
          ),

          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 16),

          const Text('Account & support',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.event_busy_outlined),
            title: const Text('Leave requests'),
            trailing: const Icon(Icons.chevron_right, size: 20),
            contentPadding: EdgeInsets.zero,
            onTap: () => context.push('/settings/leave'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications_active_outlined),
            title: const Text('Notification categories'),
            trailing: const Icon(Icons.chevron_right, size: 20),
            contentPadding: EdgeInsets.zero,
            onTap: () => context.push('/settings/notification-preferences'),
          ),
          ListTile(
            leading: const Icon(Icons.bug_report_outlined),
            title: const Text('Report a bug'),
            trailing: const Icon(Icons.chevron_right, size: 20),
            contentPadding: EdgeInsets.zero,
            onTap: () => context.push('/report-bug'),
          ),
          ListTile(
            leading: const Icon(Icons.menu_book_outlined),
            title: const Text('Financial ledgers'),
            trailing: const Icon(Icons.chevron_right, size: 20),
            contentPadding: EdgeInsets.zero,
            onTap: () => context.push('/finance-ledgers'),
          ),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          const Text('App',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Version'),
            subtitle: const Text('1.0.0'),
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }
}
