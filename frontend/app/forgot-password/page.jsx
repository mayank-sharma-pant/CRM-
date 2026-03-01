'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../services/api';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState('email'); // 'email', 'otp', 'success'
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.message);
            setStep('otp');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email,
                otp_code: otpCode,
                new_password: newPassword,
            });
            setStep('success');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-page flex items-center justify-center py-12 px-4 animate-fade-in-up">
                <div className="max-w-md w-full">
                    <div className="bg-surface rounded-2xl shadow-xl border border-border p-8 sm:p-10 text-center">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-primary mb-2">Password Reset!</h2>
                        <p className="text-sm text-secondary mb-6">Your password has been updated. You can now log in.</p>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg text-center transition-all"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
            <div className="max-w-md w-full">
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
                            {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                        </h2>
                        <p className="mt-2 text-sm text-secondary">
                            {step === 'email'
                                ? 'Enter your email and we\'ll send you a reset code.'
                                : 'Enter the code and your new password.'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6 animate-fade-in">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {message && step === 'otp' && (
                        <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6 animate-fade-in">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {message}
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleRequestCode} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-secondary mb-1.5">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label htmlFor="otp" className="block text-sm font-semibold text-secondary mb-1.5">
                                    Reset Code
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    required
                                    maxLength={6}
                                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm text-center text-lg tracking-[0.3em] font-bold"
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-semibold text-secondary mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                                        placeholder="Min. 8 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-secondary mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center text-sm">
                        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors">
                            ← Back to Login
                        </Link>
                    </div>

                </div>
                <p className="text-center text-xs text-muted mt-8">
                    &copy; 2024 CRM Inc. Secure Access.
                </p>
            </div>
        </div>
    );
}
