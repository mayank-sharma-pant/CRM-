'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { outboundWebhooks } from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function WebhooksSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await outboundWebhooks.list();
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load webhooks.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await outboundWebhooks.create(url.trim());
      setNewSecret(created.secret);
      setUrl('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create endpoint.');
    } finally {
      setCreating(false);
    }
  };

  if (!allowed) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">Only company admins and managing directors can manage webhooks.</p>
        <Link href="/settings" className="mt-4 inline-block text-sm underline">Back to settings</Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Outbound webhooks</h1>
          <p className="text-sm text-slate-500 mt-1">
            POST signed JSON for lead.created, deal.stage_changed, and invoice.paid.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {error && <p className="text-sm text-red-600">{typeof error === 'string' ? error : 'Request failed'}</p>}
        {newSecret && (
          <div className="p-6 rounded-xl border border-amber-300 bg-amber-50" role="status">
            <h2 className="text-sm font-semibold">Copy this signing secret now</h2>
            <code className="mt-3 block break-all text-xs bg-white p-3 rounded border">{newSecret}</code>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
              onClick={async () => {
                await navigator.clipboard.writeText(newSecret);
                setCopied(true);
              }}
            >
              <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
        <form onSubmit={handleCreate} className="p-6 rounded-xl border bg-white dark:bg-slate-800 space-y-3">
          <label className="block text-xs font-medium" htmlFor="webhook-url">HTTPS endpoint</label>
          <input
            id="webhook-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/perioxia"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" disabled={creating} className="px-3 py-2 text-sm font-semibold rounded-md bg-slate-900 text-white disabled:opacity-50">
            {creating ? 'Saving…' : 'Add endpoint'}
          </button>
        </form>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No endpoints yet</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-white dark:bg-slate-800">
            {items.map((row) => (
              <li key={row.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium break-all">{row.url}</p>
                  <p className="text-xs text-slate-500">{(row.events || ['all events']).join(', ')}</p>
                </div>
                <button
                  type="button"
                  aria-label="Delete endpoint"
                  onClick={async () => {
                    if (!window.confirm('Remove this endpoint?')) return;
                    await outboundWebhooks.remove(row.id);
                    await load();
                  }}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
