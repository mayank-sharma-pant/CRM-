'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiKeys } from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const [name, setName] = useState('');
  const [access, setAccess] = useState('read');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const [revokingId, setRevokingId] = useState(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiKeys.list();
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load API keys.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const created = await apiKeys.create(name.trim(), access);
      setNewToken(created.token);
      setName('');
      setAccess('read');
      await load();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Could not create key.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this key? Integrations using it will stop working immediately.')) {
      return;
    }
    setRevokingId(id);
    try {
      await apiKeys.revoke(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not revoke key.');
    } finally {
      setRevokingId(null);
    }
  };

  const copyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
  };

  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">API keys</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Only company admins and managing directors can create API keys.
          </p>
          <Link href="/settings" className="mt-4 inline-block text-sm text-slate-700 dark:text-slate-200 underline">
            Back to settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">API keys</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authenticate integrations against <code className="text-xs">/api/v1/</code> with a read or write key.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {newToken && (
          <div className="p-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700" role="dialog" aria-labelledby="token-once">
            <h2 id="token-once" className="text-sm font-semibold text-slate-900 dark:text-white">Copy this token now</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">It will not be shown again.</p>
            <code className="mt-3 block break-all text-xs bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
              {newToken}
            </code>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600"
              >
                <Copy size={12} />
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => { setNewToken(null); setCopied(false); }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Create key</div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Access
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="read">Read (GET only)</option>
              <option value="write">Write (GET + POST/PATCH)</option>
            </select>
          </label>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <KeyRound size={12} />
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </form>

        {loading && <p className="text-sm text-slate-500">Loading keys…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No live API keys yet.</p>
        )}
        {!loading && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((key) => (
              <li key={key.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{key.name}</div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">{key.prefix}…</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {key.access}
                    {key.last_used_at ? ` · last used ${key.last_used_at}` : ' · never used'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-red-300 text-red-700 disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
