import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';

enum _LoginMethod { password, otp }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  _LoginMethod _method = _LoginMethod.password;
  bool _obscure = true;
  bool _otpSent = false;
  bool _sendingOtp = false;
  String? _otpMessage;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _otpMessage = 'Enter a valid email first');
      return;
    }
    setState(() {
      _sendingOtp = true;
      _otpMessage = null;
    });
    try {
      await ref.read(authProvider.notifier).requestOtp(email);
      setState(() {
        _otpSent = true;
        _otpMessage = 'Verification code sent to your email';
      });
    } catch (e) {
      setState(() => _otpMessage = 'Failed to send OTP. Try again.');
    } finally {
      setState(() => _sendingOtp = false);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    final notifier = ref.read(authProvider.notifier);

    if (_method == _LoginMethod.password) {
      await notifier.login(_emailCtrl.text.trim(), _passwordCtrl.text);
    } else {
      if (_otpCtrl.text.trim().isEmpty) return;
      await notifier.loginOtp(_emailCtrl.text.trim(), _otpCtrl.text.trim());
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;

    ref.listen<AuthState>(authProvider, (_, next) {
      if (next.status == AuthStatus.authenticated) {
        final u = next.user;
        if (u != null && u.isPlatformAdmin) {
          context.go('/platform-pending');
        } else {
          context.go('/dashboard');
        }
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.bolt_rounded,
                          color: Colors.white, size: 26),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Welcome back',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sign in to access your dashboard',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 32),

                    // Method toggle
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.all(3),
                      child: Row(
                        children: [
                          _MethodTab(
                            label: 'Password',
                            active: _method == _LoginMethod.password,
                            onTap: () => setState(() {
                              _method = _LoginMethod.password;
                              _otpMessage = null;
                            }),
                          ),
                          _MethodTab(
                            label: 'OTP Login',
                            active: _method == _LoginMethod.otp,
                            onTap: () => setState(() {
                              _method = _LoginMethod.otp;
                            }),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Error
                    if (authState.error != null)
                      _ErrorCard(message: authState.error!),

                    // Email
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email address',
                        hintText: 'name@company.com',
                        prefixIcon: Icon(Icons.email_outlined, size: 20),
                      ),
                      validator: (v) =>
                          (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                    ),
                    const SizedBox(height: 16),

                    // Password field or OTP field
                    if (_method == _LoginMethod.password) ...[
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _handleSubmit(),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          hintText: '••••••••',
                          prefixIcon: const Icon(Icons.lock_outline, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              size: 20,
                            ),
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Enter your password' : null,
                      ),
                    ] else ...[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _otpCtrl,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              enabled: _otpSent,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _handleSubmit(),
                              decoration: InputDecoration(
                                labelText: 'Verification code',
                                hintText: _otpSent
                                    ? 'Enter 6-digit code'
                                    : 'Click Send Code',
                                counterText: '',
                                prefixIcon:
                                    const Icon(Icons.pin_outlined, size: 20),
                              ),
                              validator: (_method == _LoginMethod.otp && _otpSent)
                                  ? (v) => (v == null || v.length < 6)
                                      ? 'Enter the 6-digit code'
                                      : null
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: SizedBox(
                              height: 48,
                              child: OutlinedButton(
                                onPressed:
                                    _sendingOtp ? null : _handleSendOtp,
                                child: Text(
                                  _otpSent ? 'Resend' : 'Send Code',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_otpMessage != null) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.info_outline,
                                size: 14, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _otpMessage!,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: _otpMessage!.contains('Failed')
                                      ? AppColors.error
                                      : AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                    const SizedBox(height: 28),

                    // Submit
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: FilledButton(
                        onPressed: isLoading ||
                                (_method == _LoginMethod.otp && !_otpSent)
                            ? null
                            : _handleSubmit,
                        style: FilledButton.styleFrom(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : Text(
                                _method == _LoginMethod.otp
                                    ? 'Verify & Sign in'
                                    : 'Sign in',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 15),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Forgot password
                    TextButton(
                      onPressed: () {
                        // TODO: navigate to forgot password
                      },
                      child: Text(
                        'Forgot your password?',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    Text(
                      '© 2024 Perioxia CRM. Secure Access.',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MethodTab extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _MethodTab(
      {required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? Theme.of(context).colorScheme.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: active
                ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4)]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: active
                  ? Theme.of(context).colorScheme.onSurface
                  : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  const _ErrorCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.error.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 18, color: AppColors.error),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppColors.error, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
