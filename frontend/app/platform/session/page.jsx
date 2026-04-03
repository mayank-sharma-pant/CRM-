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
            <div className="p-8">
                <p className="text-red-600 font-medium">{error || 'Unknown error'}</p>
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
