'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from '../../components/AuthShell';

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

    const extractSignupError = (err) => {
        const fallback = 'Registration failed. Please try again.';
        const data = err?.response?.data;

        if (!err?.response) {
            return 'Cannot reach server right now. Please refresh and try again.';
        }

        if (!data) return fallback;

        if (typeof data.detail === 'string' && data.detail.trim()) {
            return data.detail;
        }

        if (Array.isArray(data.detail) && data.detail.length > 0) {
            const first = data.detail[0];
            if (typeof first === 'string' && first.trim()) return first;
            if (first?.msg) return first.msg;
        }

        if (typeof data.error === 'string' && data.error.trim()) {
            return data.error;
        }

        return fallback;
    };

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
            setError(extractSignupError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell eyebrow="14-day trial · no card">
            <div className="auth-card">
                <Link href="/" className="auth-card-brand hover:opacity-80 transition-opacity lg:hidden">
                    <span className="brand-mark">P</span>
                    <span className="font-display text-[15px] font-semibold tracking-tight text-primary">
                        Perioxia
                    </span>
                </Link>

                <h2 className="auth-card-title">Open your desk</h2>
                <p className="auth-card-sub">Start a 14-day trial — no card required</p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error px-3.5 py-2.5 rounded-lg text-sm animate-fade-in">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="fullName" className="auth-label">
                            Full name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            className="auth-input"
                            placeholder="Priya Shah"
                            value={formData.fullName}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="auth-label">
                            Work email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="auth-input"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="auth-label">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            className="auth-input"
                            placeholder="At least 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="border-t border-border my-1" />

                    <div>
                        <label htmlFor="businessName" className="auth-label">
                            Business name
                        </label>
                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            required
                            className="auth-input"
                            placeholder="Shah Interiors"
                            value={formData.businessName}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="auth-label">
                            Phone <span className="text-muted font-normal">(optional)</span>
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            className="auth-input"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="auth-submit mt-1">
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-secondary">Already have an account? </span>
                    <Link
                        href="/login"
                        className="font-semibold text-accent hover:text-accent-hover transition-colors"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
            <p className="auth-footer-note">&copy; 2026 Perioxia CRM</p>
        </AuthShell>
    );
}
