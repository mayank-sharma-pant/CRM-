import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/data/models/user.dart';
import 'package:perioxia_crm/data/repositories/auth_repository.dart';

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

  AuthNotifier(this._repo) : super(const AuthState()) {
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
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  String get dashboardRoute {
    final role = state.user?.role ?? 'sales';
    return '/dashboard';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
