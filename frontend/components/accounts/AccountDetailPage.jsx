'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { accountsHomePath, clientsHomePath } from '../../lib/leadsPaths';

export default function AccountDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const basePath = accountsHomePath(pathname);
    const clientBase = clientsHomePath(pathname);
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        if (!params?.id) return;
        try {
            const res = await api.get(`/accounts/${params.id}`);
            setAccount(res.data);
            setName(res.data.name || '');
            setError(null);
        } catch (err) {
            setError(err.response?.status === 404 ? 'Account not found' : 'Failed to load account');
            setAccount(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [params?.id]);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/accounts/${params.id}`, { name: name.trim() });
            await load();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!window.confirm('Delete this account? Contacts must be unlinked first.')) return;
        try {
            await api.delete(`/accounts/${params.id}`);
            router.push(basePath);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Could not delete');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="p-8">
                <p className="text-red-500">{error || 'Account not found'}</p>
                <Link href={basePath} className="text-sm text-blue-600 mt-4 inline-block">Back to accounts</Link>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full p-8">
            <div className="max-w-3xl mx-auto">
                <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-500 mb-6">
                    <ArrowLeft size={14} /> Accounts
                </Link>
                <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <label htmlFor="account-name" className="block text-xs font-semibold text-slate-400 uppercase mb-1">Name</label>
                    <div className="flex gap-2">
                        <input
                            id="account-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-900"
                        />
                        <button type="submit" disabled={saving} className="px-3 py-2 text-sm font-semibold rounded-md bg-slate-900 text-white disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                    {account.website && <p className="text-sm text-slate-500 mt-3">{account.website}</p>}
                    <button type="button" onClick={remove} className="mt-6 text-sm text-red-600">
                        Delete account
                    </button>
                </form>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Contacts</h2>
                    {(account.contacts || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No clients linked yet</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                            {account.contacts.map((c) => (
                                <li key={c.id} className="py-2">
                                    <Link href={`${clientBase}/${c.id}`} className="text-sm font-medium text-blue-600">
                                        {c.name}
                                    </Link>
                                    {c.email && <span className="text-xs text-slate-500 ml-2">{c.email}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
