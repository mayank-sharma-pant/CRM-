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
            <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-page">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Accounts</h1>
                    <p className="page-subtitle">Buyer companies. Link people (clients) for B2B.</p>
                </div>
            </div>

            <div className="page-body space-y-5">
                <form onSubmit={create} className="panel p-4 flex flex-col sm:flex-row gap-2 sm:items-center max-w-xl">
                    <label className="sr-only" htmlFor="new-account-name">New account name</label>
                    <input
                        id="new-account-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Company name"
                        className="input flex-1"
                    />
                    <button
                        type="submit"
                        disabled={saving || !name.trim()}
                        className="btn btn-primary shrink-0"
                    >
                        {saving ? 'Saving…' : 'Add account'}
                    </button>
                </form>

                {error && (
                    <p className="text-sm text-error" role="alert">{error}</p>
                )}

                {items.length === 0 && !error ? (
                    <div className="panel p-12 text-center">
                        <p className="text-[13px] text-muted">No accounts yet</p>
                    </div>
                ) : (
                    <div className="panel overflow-hidden divide-y divide-border">
                        {items.map((row) => (
                            <Link
                                key={row.id}
                                href={`${basePath}/${row.id}`}
                                className="group block hover:bg-surface-elevated transition-colors"
                            >
                                <div className="px-4 py-3.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                            <Building2 size={16} className="text-muted" />
                                            {row.name}
                                        </p>
                                        <p className="text-[12px] text-muted mt-0.5">
                                            {row.contact_count} {row.contact_count === 1 ? 'contact' : 'contacts'}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-muted group-hover:text-accent" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
