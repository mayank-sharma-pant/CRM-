'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../services/api';

export default function AcceptInvitePage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token;

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [accepted, setAccepted] = useState(false);

    const handleAccept = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await api.post(`/auth/accept-invite/${token}`, {
                password: '',
            });

            const { access_token, user } = response.data;

            // Store token for immediate login
            localStorage.setItem('token', access_token);
            api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            setAccepted(true);

            // Redirect to role-appropriate dashboard after brief delay
            setTimeout(() => {
                const routes = {
                    sales: '/sales/dashboard',
                    manager: '/manager/dashboard',
                    md: '/md/dashboard',
                    purchase: '/purchase/dashboard',
                    admin: '/admin/dashboard',
                };
                router.push(routes[user?.role] || '/sales/dashboard');
            }, 2000);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Failed to accept invite. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    if (accepted) {
        return (
            <div className="min-h-screen bg-page flex items-center justify-center py-12 px-4 animate-fade-in-up">
                <div className="max-w-md w-full">
                    <div className="bg-surface rounded-2xl shadow-xl border border-border p-8 sm:p-10 text-center">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-primary mb-2">Account Created!</h2>
                        <p className="text-sm text-secondary">Your account has been set up successfully. Redirecting to your dashboard...</p>
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
                            Accept Invitation
                        </h2>
                        <p className="mt-2 text-sm text-secondary">
                            Click the button below to create your account. You can log in using the password from your invite email.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in mb-5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm transition-all duration-200"
                        >
                            {loading ? 'Creating account...' : 'Accept & Create Account'}
                        </button>
                    </div>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-secondary">Already have an account? </span>
                        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors">
                            Sign in
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
