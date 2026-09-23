'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const PLATFORM_API = '/api/platform';

export default function PlatformSessionPage() {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('platform_token');
        if (!token) {
            setError('No platform token');
            setLoading(false);
            return;
        }
        fetch(`${PLATFORM_API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error('Session invalid');
                return res.json();
            })
            .then(setMe)
            .catch(() => setError('Could not load platform session'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !me) {
        return (
            <div className="p-5 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="max-w-xl w-full bg-surface rounded-xl border border-red-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <ShieldCheck className="text-error" size={22} />
                        <h2 className="text-lg font-semibold text-primary">Platform session problem</h2>
                    </div>
                    <p className="text-sm text-secondary mb-4">
                        {error === 'No platform token'
                            ? 'No platform admin token was found in this browser. To continue, sign in to the platform admin console.'
                            : 'Your platform admin session could not be validated. This usually means your token has expired or was cleared.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <a
                            href="/platform/login"
                            className="inline-flex items-center justify-center px-3.5 py-2 bg-primary text-inverse text-[14px] font-medium rounded-md hover:opacity-90 transition-opacity"
                        >
                            Go to platform login
                        </a>
                        <a
                            href="/"
                            className="inline-flex items-center justify-center px-3.5 py-2 border border-border text-secondary hover:bg-surface-elevated text-[14px] font-medium rounded-md transition-colors"
                        >
                            Back to CRM
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const fields = [
        { label: 'Full name', value: me.full_name || '—' },
        { label: 'Email', value: me.email || '—' },
        { label: 'User ID', value: me.id ?? '—', mono: true },
        { label: 'Role', value: (me.role || '—').toString().toUpperCase() },
    ];

    return (
        <div className="p-5 sm:p-6 lg:p-8 max-w-xl space-y-5">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-success flex items-center justify-center">
                        <ShieldCheck size={18} />
                    </div>
                    <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                        Platform session
                    </h1>
                </div>
                <p className="text-[15px] text-muted mt-1">
                    Identity as validated by the platform API. This should match your operator account.
                </p>
            </div>

            <div className="bg-surface rounded-xl border border-border p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map((field) => (
                        <div key={field.label}>
                            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                                {field.label}
                            </p>
                            <p
                                className={`text-[14px] font-semibold text-primary mt-1 ${
                                    field.mono ? 'font-mono text-[14px]' : ''
                                }`}
                            >
                                {field.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
