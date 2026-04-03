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
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !me) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="max-w-xl w-full bg-white rounded-xl border border-red-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <ShieldCheck className="text-red-600" size={24} />
                        <h2 className="text-lg font-bold text-slate-900">Platform session problem</h2>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                        {error === 'No platform token'
                            ? 'No platform admin token was found in this browser. To continue, sign in to the platform admin console.'
                            : 'Your platform admin session could not be validated. This usually means your token has expired or was cleared.'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <a
                            href="/platform/login"
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Go to platform login
                        </a>
                        <a
                            href="/"
                            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
                        >
                            Back to CRM
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-xl">
            <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="text-green-600" size={28} />
                <h1 className="text-2xl font-bold text-slate-900">Platform session</h1>
            </div>
            <p className="text-slate-600 text-sm mb-6">
                Identity as validated by the platform API (Bearer token). This should match your operator account.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Full name</p>
                    <p className="text-lg font-bold text-slate-900">{me.full_name || '—'}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                    <p className="text-slate-800">{me.email || '—'}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">User ID</p>
                    <p className="text-slate-800 font-mono">{me.id ?? '—'}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Role</p>
                    <p className="text-slate-800">{(me.role || '—').toString().toUpperCase()}</p>
                </div>
            </div>
        </div>
    );
}
