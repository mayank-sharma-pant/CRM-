'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import AuthShell from '../../components/AuthShell';

const OAUTH_ERRORS = {
    no_account: 'No account exists for that email. Ask your admin for an invite, or sign up.',
    disabled: 'This account is disabled.',
    company: 'Your company account is not active.',
    provider: 'That sign-in provider is not available.',
    denied: 'Sign-in was cancelled or failed. Try again.',
};

function LoginInner() {
    const [loginMethod, setLoginMethod] = useState('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState('credentials');
    const [mfaToken, setMfaToken] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [oauthProviders, setOauthProviders] = useState({ google: false, microsoft: false });
    const [samlCode, setSamlCode] = useState('');
    const { login, requestOTP, loginOTP, verify2FA, fetchUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const justRegistered = searchParams.get('registered') === 'true';
    const justEnrolled = searchParams.get('enrolled') === 'true';

    const handleRedirect = (userObj) => {
        const role = userObj?.role || 'sales';
        if (role === 'admin' && !userObj.company_id) {
            router.push('/platform/requests');
            return;
        }
        const routes = {
            sales: '/sales/dashboard',
            manager: '/manager/dashboard',
            md: '/md/dashboard',
            purchase: '/purchase/dashboard',
            admin: '/admin/dashboard',
        };
        router.push(routes[role] || '/sales/dashboard');
    };

    useEffect(() => {
        api.get('/auth/oauth/providers')
            .then((res) => setOauthProviders(res.data || {}))
            .catch(() => setOauthProviders({ google: false, microsoft: false }));
    }, []);

    useEffect(() => {
        const oauthError = searchParams.get('oauth_error');
        if (oauthError) {
            setError(OAUTH_ERRORS[oauthError] || 'Sign-in failed. Try again.');
            return;
        }

        if (searchParams.get('mfa_required') === '1' && searchParams.get('mfa_token')) {
            setMfaToken(searchParams.get('mfa_token'));
            setStage('2fa');
            return;
        }

        if (searchParams.get('mfa_setup_required') === '1' && searchParams.get('setup_token')) {
            router.replace(
                '/settings/security?setup_token=' +
                    encodeURIComponent(searchParams.get('setup_token')) +
                    '&forced=1'
            );
            return;
        }

        if (searchParams.get('oauth') === 'success') {
            let cancelled = false;
            (async () => {
                setLoading(true);
                try {
                    await fetchUser();
                    const me = await api.get('/auth/me');
                    if (!cancelled) handleRedirect(me.data);
                } catch {
                    if (!cancelled) setError('Signed in, but session could not be loaded. Try refreshing.');
                } finally {
                    if (!cancelled) setLoading(false);
                }
            })();
            return () => {
                cancelled = true;
            };
        }
    }, [searchParams, fetchUser, router]);

    const startOAuth = (provider) => {
        window.location.href = `/api/auth/oauth/${provider}/start`;
    };

    const startSaml = () => {
        const code = (samlCode || '').trim().toUpperCase();
        if (!code) {
            setError('Enter your company code to use company SSO.');
            return;
        }
        window.location.href = `/api/auth/saml/${encodeURIComponent(code)}/start`;
    };

    const handleRequestOTP = async (e) => {
        e?.preventDefault();
        if (!email) {
            setError('Please enter your email address first');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await requestOTP(email);
            setOtpSent(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (loginMethod === 'password') {
                result = await login(email, password);
            } else {
                if (!otpCode) {
                    setError('Please enter the verification code');
                    setLoading(false);
                    return;
                }
                result = await loginOTP(email, otpCode);
            }

            if (result.mfa_required) {
                setMfaToken(result.mfa_token);
                setStage('2fa');
                return;
            }

            if (result.mfa_setup_required) {
                router.push(
                    '/settings/security?setup_token=' +
                        encodeURIComponent(result.setup_token) +
                        '&forced=1'
                );
                return;
            }

            handleRedirect(result.user);
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        if (!twoFactorCode) {
            setError(useRecoveryCode ? 'Please enter a recovery code' : 'Please enter the 6-digit code');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await verify2FA(mfaToken, twoFactorCode);
            handleRedirect(res.user);
        } catch (err) {
            setError(err.response?.data?.detail || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <div className="auth-card">
                <Link href="/" className="auth-card-brand hover:opacity-80 transition-opacity lg:hidden">
                    <span className="brand-mark">P</span>
                    <span className="font-display text-[15px] font-semibold tracking-tight text-primary">
                        Perioxia
                    </span>
                </Link>

                <h2 className="auth-card-title">
                    {stage === '2fa' ? 'Two-factor verification' : 'Welcome back'}
                </h2>
                <p className="auth-card-sub">
                    {stage === '2fa'
                        ? 'Enter the code from your authenticator app'
                        : 'Sign in with your work email to open your desk'}
                </p>

                {stage === '2fa' ? (
                    <form className="space-y-5" onSubmit={handleVerify2FA}>
                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-3.5 py-2.5 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="twoFactorCode" className="auth-label">
                                {useRecoveryCode ? 'Recovery code' : 'Authentication code'}
                            </label>
                            <input
                                id="twoFactorCode"
                                name="twoFactorCode"
                                type="text"
                                inputMode={useRecoveryCode ? 'text' : 'numeric'}
                                autoComplete="one-time-code"
                                maxLength={useRecoveryCode ? 8 : 6}
                                required
                                autoFocus
                                className="auth-input tracking-widest text-center"
                                placeholder={useRecoveryCode ? 'XXXXXXXX' : '000000'}
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="auth-submit">
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>

                        <div className="flex items-center justify-between text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseRecoveryCode(!useRecoveryCode);
                                    setTwoFactorCode('');
                                    setError('');
                                }}
                                className="font-medium text-accent hover:text-accent-hover transition-colors"
                            >
                                {useRecoveryCode ? 'Use authenticator code' : 'Use a recovery code'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setStage('credentials');
                                    setMfaToken('');
                                    setTwoFactorCode('');
                                    setUseRecoveryCode(false);
                                    setError('');
                                }}
                                className="font-medium text-muted hover:text-secondary transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {justEnrolled && (
                            <div className="bg-accent-subtle border border-accent/20 text-accent px-3.5 py-2.5 rounded-lg text-sm mb-5 animate-fade-in">
                                Two-factor authentication is on. Sign in again and enter the code from your
                                authenticator app.
                            </div>
                        )}
                        {justRegistered && (
                            <div className="bg-accent-subtle border border-accent/20 text-accent px-3.5 py-2.5 rounded-lg text-sm mb-5 animate-fade-in">
                                Registration complete. Your company is pending admin approval — you can sign
                                in once approved.
                            </div>
                        )}

                        <div className="auth-segment">
                            <button
                                type="button"
                                onClick={() => {
                                    setLoginMethod('password');
                                    setError('');
                                    setOtpSent(false);
                                }}
                                className={loginMethod === 'password' ? 'is-active' : ''}
                            >
                                Password
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLoginMethod('otp');
                                    setError('');
                                }}
                                className={loginMethod === 'otp' ? 'is-active' : ''}
                            >
                                Email code
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-error/10 border border-error/20 text-error px-3.5 py-2.5 rounded-lg text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="auth-label">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="auth-input"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {loginMethod === 'password' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor="password" className="auth-label mb-0">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                                        >
                                            {showPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        className="auth-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="otp" className="auth-label">
                                        Verification code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            maxLength={6}
                                            required={loginMethod === 'otp' && otpSent}
                                            disabled={!otpSent}
                                            className="auth-input flex-1"
                                            placeholder={otpSent ? '6-digit code' : 'Send a code first'}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRequestOTP}
                                            disabled={loading || !email}
                                            className="px-3.5 py-2 bg-accent-subtle border border-accent/20 rounded-lg text-xs font-semibold text-accent hover:bg-accent/15 transition-colors disabled:opacity-50 shrink-0"
                                        >
                                            {otpSent ? 'Resend' : 'Send'}
                                        </button>
                                    </div>
                                    {otpSent && (
                                        <p className="mt-2 text-[12px] text-accent">Code sent to your email</p>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || (loginMethod === 'otp' && !otpSent)}
                                className="auth-submit mt-1"
                            >
                                {loading
                                    ? 'Signing in…'
                                    : loginMethod === 'otp'
                                      ? 'Verify & sign in'
                                      : 'Sign in'}
                            </button>
                        </form>

                        <div className="mt-3.5 text-center">
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-muted hover:text-accent transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>

                        <div className="mt-6 space-y-2.5">
                            <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-surface px-2 text-muted">or</span>
                                </div>
                            </div>
                            {oauthProviders.google && (
                                <button
                                    type="button"
                                    onClick={() => startOAuth('google')}
                                    className="w-full py-2.5 px-4 border border-border rounded-lg text-sm font-medium text-primary bg-surface hover:bg-surface-elevated transition-colors"
                                >
                                    Continue with Google
                                </button>
                            )}
                            {oauthProviders.microsoft && (
                                <button
                                    type="button"
                                    onClick={() => startOAuth('microsoft')}
                                    className="w-full py-2.5 px-4 border border-border rounded-lg text-sm font-medium text-primary bg-surface hover:bg-surface-elevated transition-colors"
                                >
                                    Continue with Microsoft
                                </button>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={samlCode}
                                    onChange={(e) => setSamlCode(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    placeholder="Company code"
                                    aria-label="Company code for SSO"
                                    className="auth-input flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={startSaml}
                                    className="px-3 py-2.5 border border-border rounded-lg text-sm font-medium text-secondary bg-surface hover:bg-surface-elevated whitespace-nowrap"
                                >
                                    Company SSO
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-secondary">Don&apos;t have an account? </span>
                            <Link
                                href="/signup"
                                className="font-semibold text-accent hover:text-accent-hover transition-colors"
                            >
                                Create an account
                            </Link>
                        </div>
                    </>
                )}
            </div>
            <p className="auth-footer-note">&copy; 2026 Perioxia CRM</p>
        </AuthShell>
    );
}

export default function Login() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-page flex items-center justify-center">
                    <p className="text-sm text-secondary">Loading…</p>
                </div>
            }
        >
            <LoginInner />
        </Suspense>
    );
}
