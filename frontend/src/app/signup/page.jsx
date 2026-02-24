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
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const result = await signup(formData);
            // Signup creates a pending company — user can't login yet
            setSuccess(result.message || 'Account created! Your company is pending approval. You will be notified once approved.');
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
            <div className="max-w-lg w-full">

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">

                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Create your account
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Get started with your free trial
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    {success}
                                    <div className="mt-2">
                                        <Link href="/login" className="font-semibold text-emerald-800 hover:underline">
                                            Go to Login →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Personal Info Group */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Full Name
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                                        placeholder="name@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                                        placeholder="Min. 6 characters"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 my-4"></div>

                            {/* Business Info Group */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label htmlFor="businessName" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Business Name
                                    </label>
                                    <input
                                        id="businessName"
                                        name="businessName"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                                        placeholder="Acme Corp"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Phone <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
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
                                disabled={loading || success}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm transition-all duration-200"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-500">Already have an account? </span>
                        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                            Sign in
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}
