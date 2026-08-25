'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookMarked, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function AccountingSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [items, setItems] = useState([]);
  const [provider, setProvider] = useState('tally');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [connRes, itemsRes] = await Promise.all([
        api.get('/accounting/connection'),
        api.get('/accounting/items'),
      ]);
      setConnection(connRes.data);
      if (connRes.data.provider) setProvider(connRes.data.provider);
      setItems(itemsRes.data.items || []);
    } catch (err) {
      setError(formatError(err, 'Could not load accounting.'));
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const doConnect = async () => {
    setBusy(true);
    try {
      const res = await api.put('/accounting/connection', { provider });
      setConnection(res.data);
      showToast(`Connected ${provider === 'tally' ? 'Tally' : 'QuickBooks'} (stub)`, 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not connect.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = async () => {
    setBusy(true);
    try {
      const res = await api.delete('/accounting/connection');
      setConnection(res.data);
      showToast('Disconnected', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not disconnect.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doSync = async () => {
    setBusy(true);
    try {
      const res = await api.post('/accounting/sync');
      showToast(
        `Pushed ${res.data.pushed}, skipped ${res.data.skipped}, unchanged ${res.data.unchanged}`,
        'success',
      );
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not sync.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
        <div className="max-w-3xl mx-auto px-8 py-10 text-sm text-slate-500">
          Admin or MD access is required to manage accounting sync.
        </div>
      </div>
    );
  }

  const connected = connection?.status === 'connected';

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-blue-600">
            Settings
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <BookMarked size={18} />
            Accounting sync
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Push invoices to Tally or QuickBooks. This build uses a stub provider — no live books API.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <>
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Connection</div>
              <p className="text-xs text-slate-500">
                Status: {connected ? `Connected (${connection.provider})` : 'Disconnected'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-slate-500" htmlFor="provider">
                  Provider
                </label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={busy}
                  className="text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
                >
                  <option value="tally">Tally</option>
                  <option value="quickbooks">QuickBooks</option>
                </select>
                <button
                  type="button"
                  onClick={doConnect}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={doDisconnect}
                  disabled={busy || !connected}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={doSync}
                  disabled={busy || !connected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Sync invoices
                </button>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Last sync items</div>
              {items.length === 0 ? (
                <p className="text-xs text-slate-500">No invoices synced yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {items.map((row) => (
                    <li key={`${row.invoice_id}-${row.provider}`} className="py-2 flex justify-between gap-3">
                      <span className="text-slate-800 dark:text-slate-200">
                        Invoice #{row.invoice_id}
                        <span className="ml-2 text-xs text-slate-500">{row.provider}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {row.status}
                        {row.external_id ? ` · ${row.external_id.slice(0, 8)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
