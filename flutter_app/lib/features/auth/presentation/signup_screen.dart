import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _companyCtrl.dispose();
    _phoneCtrl.dispose();
    _pwCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).signup(
            email: _emailCtrl.text.trim(),
            fullName: _nameCtrl.text.trim(),
            password: _pwCtrl.text,
            companyName: _companyCtrl.text.trim(),
            phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
          );
      await ref.read(authProvider.notifier).checkAuth();
      if (!mounted) return;
      final u = ref.read(authProvider).user;
      if (u != null && u.isPlatformAdmin) {
        context.go('/platform-pending');
      } else {
        context.go(homePathForUser(u));
      }
    } on DioException catch (e) {
      setState(() => _error = ApiException.fromDioError(e).message);
    } catch (_) {
      setState(() => _error = 'Registration failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
        title: const Text('Create account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Register your company. Your account stays pending until a platform operator approves it.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 20),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.error.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(
                              color: AppColors.error, fontSize: 13)),
                    ),
                  TextFormField(
                    controller: _nameCtrl,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.person_outline, size: 20),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Work email',
                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                    ),
                    validator: (v) =>
                        (v == null || !v.contains('@')) ? 'Valid email required' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _companyCtrl,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Company name',
                      prefixIcon: Icon(Icons.business_outlined, size: 20),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone (optional)',
                      prefixIcon: Icon(Icons.phone_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _pwCtrl,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline, size: 20),
                    ),
                    validator: (v) =>
                        (v == null || v.length < 8) ? 'At least 8 characters' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _confirmCtrl,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm password',
                      prefixIcon: Icon(Icons.lock_outline, size: 20),
                    ),
                    validator: (v) =>
                        v != _pwCtrl.text ? 'Passwords do not match' : null,
                  ),
                  const SizedBox(height: 28),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Create account'),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Already have an account? Sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
