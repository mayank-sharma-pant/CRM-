'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw, Unplug } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function errorCopy(code) {
  if (code === 'denied') return 'Mailbox connection was cancelled or denied.';
  if (code === 'provider') return 'That email provider is not available.';
  return 'Could not connect mailbox.';
}

function EmailSettingsInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/mailbox');
      setStatus(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load mailbox status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('mailbox') === 'success') {
      setNotice('Mailbox connected.');
    }
    const err = searchParams.get('mailbox_error');
    if (err) setError(errorCopy(err));
  }, [searchParams]);

  const connect = (provider) => {
    window.location.href = `/api/mailbox/oauth/${provider}/start`;
  };

  const disconnect = async () => {
    setBusy(true);
    setError('');
    try {
      await api.delete('/mailbox');
      setNotice('Mailbox disconnected.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/mailbox/sync');
      setNotice(`Imported ${res.data.imported} matching message(s).`);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Sync failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">
            <Link href="/settings" className="hover:underline">Settings</Link>
            {' / Email'}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Email</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect Gmail or Outlook to send from CRM and log matching mail on leads, clients, and deals.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            {status?.connected ? (
              <>
                <p className="text-sm text-slate-800 dark:text-slate-100">
                  Connected as <span className="font-semibold">{status.email}</span>
                  {status.provider ? ` (${status.provider})` : ''}
                </p>
                {status.status === 'error' && (
                  <p className="text-xs text-red-600">Mailbox reported an error. Reconnect or sync again.</p>
                )}
                {status.last_synced_at && (
                  <p className="text-xs text-slate-500">Last sync: {status.last_synced_at}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={syncNow}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    <RefreshCw size={12} />
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                  >
                    <Unplug size={12} />
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No mailbox connected{user?.email ? ` for ${user.email}` : ''}. SMTP still works for outbound send.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => connect('google')}
                    disabled={!status?.providers?.google}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    <Mail size={12} />
                    Connect Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => connect('microsoft')}
                    disabled={!status?.providers?.microsoft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                  >
                    Connect Outlook
                  </button>
                </div>
                {!status?.providers?.google && !status?.providers?.microsoft && (
                  <p className="text-xs text-slate-400">
                    Email OAuth is not configured on this server. Ask an operator to set Google/Microsoft OAuth client credentials and add mailbox callback URLs.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <EmailSettingsInner />
    </Suspense>
  );
}
