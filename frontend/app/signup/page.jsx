'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function Signup() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        businessName: '',
        phone: '',
        address: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signup(formData);
            router.push('/login?registered=true');
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-page flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
            <div className="max-w-lg w-full">

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
                            Create your account
                        </h2>
                        <p className="mt-2 text-sm text-secondary">
                            Get started with your free trial
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Personal Info Group */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-semibold text-secondary mb-1.5">
                                        Full Name
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                    />
                                </div>
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
                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
                                        placeholder="name@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-secondary mb-1.5">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
                                        placeholder="Min. 6 characters"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border my-4"></div>

                            {/* Business Info Group */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label htmlFor="businessName" className="block text-sm font-semibold text-secondary mb-1.5">
                                        Business Name
                                    </label>
                                    <input
                                        id="businessName"
                                        name="businessName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
                                        placeholder="Acme Corp"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-secondary mb-1.5">
                                        Phone <span className="text-muted font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
                                        placeholder="+1 (555) 000-0000"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-accent hover:opacity-90 text-page font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm transition-all duration-200"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-secondary">Already have an account? </span>
                        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors">
                            Sign in
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
