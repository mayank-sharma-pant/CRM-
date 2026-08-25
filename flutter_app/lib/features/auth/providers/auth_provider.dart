import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/data/models/user.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';
import 'package:perioxia_crm/features/crm_platform/providers/crm_platform_providers.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({AuthStatus? status, User? user, String? error}) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        error: error,
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

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final user = await _repo.login(email, password);
      if (_isPlatformAdminUser(user)) {
        try {
          await _repo.obtainPlatformToken(email, password);
          _ref.invalidate(platformTokenPresentProvider);
        } catch (_) {
          // Platform UI will prompt; main CRM session still works.
        }
      }
      state = AuthState(status: AuthStatus.authenticated, user: user);
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
      final user = await _repo.loginOtp(email, otpCode);
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on DioException catch (e) {
      final msg = ApiException.fromDioError(e).message;
      state = AuthState(status: AuthStatus.error, error: msg);
    } catch (e) {
      state = AuthState(status: AuthStatus.error, error: 'OTP verification failed.');
    }
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
