'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, requestOTP, loginOTP } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const justRegistered = searchParams.get('registered') === 'true';

    const handleRedirect = (role) => {
        const routes = {
            sales: '/sales/dashboard',
            manager: '/manager/dashboard',
            md: '/md/dashboard',
            purchase: '/purchase/dashboard',
            admin: '/admin/dashboard'
        };
        router.push(routes[role] || '/sales/dashboard');
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

            handleRedirect(result.user?.role || 'sales');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-page flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
            <div className="max-w-md w-full">

                {/* Centered Premium Card */}
                <div className="bg-surface rounded-2xl shadow-xl border border-border p-8 sm:p-10">

                    <div className="mb-8 text-center">
                        <Link href="/" className="inline-flex mb-6 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-page shadow-lg shadow-accent/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </Link>
                        <h2 className="text-2xl font-bold text-primary tracking-tight">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-secondary">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {justRegistered && (
                        <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6 animate-fade-in">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Registration complete! Your company is pending admin approval. You'll be able to log in once approved.
                        </div>
                    )}

                    {/* Method Toggle */}
                    <div className="flex p-1 bg-surface-elevated rounded-lg mb-8 border border-border">
                        <button
                            onClick={() => { setLoginMethod('password'); setError(''); setOtpSent(false); }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${loginMethod === 'password'
                                ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
                                : 'text-muted hover:text-secondary'
                                }`}
                        >
                            Password
                        </button>
                        <button
                            onClick={() => { setLoginMethod('otp'); setError(''); }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${loginMethod === 'otp'
                                ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
                                : 'text-muted hover:text-secondary'
                                }`}
                        >
                            OTP Login
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-secondary mb-1.5">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {loginMethod === 'password' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label htmlFor="password" className="block text-sm font-semibold text-secondary">
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
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="otp" className="block text-sm font-semibold text-secondary mb-1.5">
                                        Verification Code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            maxLength={6}
                                            required={loginMethod === 'otp' && otpSent}
                                            disabled={!otpSent}
                                            className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm disabled:opacity-50"
                                            placeholder={otpSent ? "Enter 6-digit code" : "Click send code"}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRequestOTP}
                                            disabled={loading || !email}
                                            className="px-4 py-2 bg-surface-elevated border border-border rounded-lg text-xs font-bold text-accent hover:bg-surface transition-all disabled:opacity-50 shrink-0"
                                        >
                                            {otpSent ? 'Resend' : 'Send Code'}
                                        </button>
                                    </div>
                                    {otpSent && (
                                        <p className="mt-2 text-[10px] text-accent flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Verification code sent to your email
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || (loginMethod === 'otp' && !otpSent)}
                                className="w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm transition-all duration-200"
                            >
                                {loading ? 'Processing...' : (loginMethod === 'otp' ? 'Verify & Sign in' : 'Sign in')}
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 text-center">
                        <Link href="/forgot-password" className="text-xs font-medium text-muted hover:text-accent transition-colors">
                            Forgot your password?
                        </Link>
                    </div>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-secondary">Don't have an account? </span>
                        <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors">
                            Create an account
                        </Link>
                    </div>
                </div>

                {/* Footer Polish */}
                <p className="text-center text-xs text-muted mt-8">
                    &copy; 2024 CRM Inc. Secure Access.
                </p>

            </div>
        </div>
    );
}
