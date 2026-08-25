'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { accountsHomePath } from '../../lib/leadsPaths';

export default function AccountsIndexPage() {
    const pathname = usePathname();
    const basePath = accountsHomePath(pathname);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const res = await api.get('/accounts');
            setItems(res.data?.items ?? []);
            setError(null);
        } catch (err) {
            setError('Failed to load accounts');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const create = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        try {
            await api.post('/accounts', { name: trimmed });
            setName('');
            await load();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Could not create account');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full">
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Accounts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Buyer companies. Link people (clients) to an account for B2B.
                    </p>
                    <form onSubmit={create} className="mt-4 flex gap-2 max-w-md">
                        <label className="sr-only" htmlFor="new-account-name">New account name</label>
                        <input
                            id="new-account-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Company name"
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-900"
                        />
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="px-3 py-2 text-sm font-semibold rounded-md bg-slate-900 text-white disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Add account'}
                        </button>
                    </form>
                </div>
            </div>
            <div className="max-w-5xl mx-auto px-8 py-8">
                {error && <p className="text-red-500 mb-4">{error}</p>}
                {items.length === 0 && !error ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                        <p className="text-slate-500">No accounts yet</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                        {items.map((row) => (
                            <Link
                                key={row.id}
                                href={`${basePath}/${row.id}`}
                                className="group block hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            >
                                <div className="px-6 py-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Building2 size={16} className="text-slate-400" />
                                            {row.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {row.contact_count} {row.contact_count === 1 ? 'contact' : 'contacts'}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
