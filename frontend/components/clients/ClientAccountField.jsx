'use client';

import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ClientAccountField({ clientId, accountId, accountName, canEdit, onSaved }) {
    const [accounts, setAccounts] = useState([]);
    const [value, setValue] = useState(accountId ? String(accountId) : '');
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        setValue(accountId ? String(accountId) : '');
    }, [accountId]);

    useEffect(() => {
        api.get('/accounts')
            .then((res) => setAccounts(res.data?.items ?? []))
            .catch(() => setAccounts([]));
    }, []);

    const save = async (account_id) => {
        setSaving(true);
        try {
            await api.put(`/clients/${clientId}`, { account_id });
            onSaved?.();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Could not link account');
        } finally {
            setSaving(false);
        }
    };

    const createAndLink = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setSaving(true);
        try {
            const created = await api.post('/accounts', { name: trimmed });
            setNewName('');
            const next = [...accounts, created.data];
            setAccounts(next);
            setValue(String(created.data.id));
            await api.put(`/clients/${clientId}`, { account_id: created.data.id });
            onSaved?.();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Could not create account');
        } finally {
            setSaving(false);
        }
    };

    if (!canEdit) {
        return (
            <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Account</span>
                <p className="text-sm text-slate-700 dark:text-slate-300">{accountName || '—'}</p>
            </div>
        );
    }

    return (
        <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Account</span>
            <div className="flex gap-2 mb-2">
                <label className="sr-only" htmlFor="client-account">Account</label>
                <select
                    id="client-account"
                    aria-label="Account"
                    value={value}
                    onChange={(e) => {
                        const next = e.target.value;
                        setValue(next);
                        save(next ? Number(next) : null);
                    }}
                    disabled={saving}
                    className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800"
                >
                    <option value="">No account</option>
                    {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2">
                <label className="sr-only" htmlFor="new-linked-account">New account</label>
                <input
                    id="new-linked-account"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New account name"
                    className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800"
                />
                <button
                    type="button"
                    onClick={createAndLink}
                    disabled={saving || !newName.trim()}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white disabled:opacity-50"
                >
                    Create
                </button>
            </div>
        </div>
    );
}
