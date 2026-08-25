import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/data/models/login_result.dart';
import 'package:perioxia_crm/data/models/user.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
  mfaChallenge,
  mfaSetup,
}

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;
  final String? mfaToken;
  final String? setupToken;
  final String? pendingEmail;
  final String? pendingPassword;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
    this.mfaToken,
    this.setupToken,
    this.pendingEmail,
    this.pendingPassword,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    String? mfaToken,
    String? setupToken,
    String? pendingEmail,
    String? pendingPassword,
  }) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        error: error,
        mfaToken: mfaToken ?? this.mfaToken,
        setupToken: setupToken ?? this.setupToken,
        pendingEmail: pendingEmail ?? this.pendingEmail,
        pendingPassword: pendingPassword ?? this.pendingPassword,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final Ref _ref;

  AuthNotifier(this._repo, this._ref) : super(const AuthState()) {
    checkAuth();
  }

  Future<void> checkAuth() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final user = await _repo.getMe();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> _finishComplete(LoginResult result, String email, String password) async {
    final user = result.user!;
    if (_isPlatformAdminUser(user)) {
      try {
        await _repo.obtainPlatformToken(email, password);
        _ref.invalidate(platformTokenPresentProvider);
      } catch (_) {}
    }
    state = AuthState(status: AuthStatus.authenticated, user: user);
  }

  Future<void> _applyLoginResult(LoginResult result, String email, String password) async {
    if (result.mfaRequired && (result.mfaToken ?? '').isNotEmpty) {
      state = AuthState(
        status: AuthStatus.mfaChallenge,
        mfaToken: result.mfaToken,
        pendingEmail: email,
        pendingPassword: password,
      );
      return;
    }
    if (result.mfaSetupRequired && (result.setupToken ?? '').isNotEmpty) {
      state = AuthState(
        status: AuthStatus.mfaSetup,
        setupToken: result.setupToken,
        pendingEmail: email,
      );
      return;
    }
    if (result.isComplete) {
      await _finishComplete(result, email, password);
      return;
    }
    state = const AuthState(
      status: AuthStatus.error,
      error: 'Login failed. Please try again.',
    );
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final result = await _repo.login(email, password);
      await _applyLoginResult(result, email, password);
    } on DioException catch (e) {
      final msg = ApiException.fromDioError(e).message;
      state = AuthState(status: AuthStatus.error, error: msg);
    } catch (e) {
      state = AuthState(status: AuthStatus.error, error: 'Login failed. Please try again.');
    }
  }

  Future<void> requestOtp(String email) async {
    await _repo.requestOtp(email);
  }

  Future<void> loginOtp(String email, String otpCode) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final result = await _repo.loginOtp(email, otpCode);
      await _applyLoginResult(result, email, '');
    } on DioException catch (e) {
      final msg = ApiException.fromDioError(e).message;
      state = AuthState(status: AuthStatus.error, error: msg);
    } catch (e) {
      state = AuthState(status: AuthStatus.error, error: 'OTP verification failed.');
    }
  }

  Future<void> verifyMfa(String code) async {
    final token = state.mfaToken;
    if (token == null || token.isEmpty) {
      state = const AuthState(status: AuthStatus.error, error: 'Session expired. Sign in again.');
      return;
    }
    final email = state.pendingEmail ?? '';
    final password = state.pendingPassword ?? '';
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final result = await _repo.verify2fa(mfaToken: token, code: code);
      if (result.isComplete) {
        await _finishComplete(result, email, password);
      } else {
        state = const AuthState(status: AuthStatus.error, error: 'Verification failed.');
      }
    } on DioException catch (e) {
      final msg = ApiException.fromDioError(e).message;
      state = AuthState(
        status: AuthStatus.mfaChallenge,
        error: msg,
        mfaToken: token,
        pendingEmail: email,
        pendingPassword: password,
      );
    } catch (_) {
      state = AuthState(
        status: AuthStatus.mfaChallenge,
        error: 'Verification failed. Please try again.',
        mfaToken: token,
        pendingEmail: email,
        pendingPassword: password,
      );
    }
  }

  void cancelMfa() {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> logout() async {
    try {
      await _repo.logout();
    } finally {
      _ref.invalidate(platformTokenPresentProvider);
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  /// For platform admins who signed in with OTP: obtain platform JWT using password.
  /// Returns `null` on success, or an error message.
  Future<String?> exchangePlatformTokenWithPassword(String password) async {
    final u = state.user;
    if (u == null) return 'Not signed in';
    final email = u.email;
    if (email.isEmpty) return 'No email on file';
    if (password.isEmpty) return 'Enter your password';
    if (!_isPlatformAdminUser(u)) {
      return 'Not a platform operator account';
    }
    try {
      await _repo.obtainPlatformToken(email, password);
      _ref.invalidate(platformTokenPresentProvider);
      return null;
    } on DioException catch (e) {
      return ApiException.fromDioError(e).message;
    } catch (_) {
      return 'Could not obtain platform token';
    }
  }

  String get dashboardRoute => homePathForUser(state.user);

  static bool _isPlatformAdminUser(User u) =>
      u.role == 'admin' && u.companyId == null;
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider), ref);
});
