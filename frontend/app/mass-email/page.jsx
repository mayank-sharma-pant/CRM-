'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function MassEmailPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('leads');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/mass-email');
      setItems(res.data.items || []);
      setRemaining(res.data.remaining_today);
    } catch (err) {
      setError(formatError(err, 'Could not load mass email.'));
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/mass-email', { subject, body, audience });
      showToast(`Sent ${res.data.sent}, skipped ${res.data.skipped}, failed ${res.data.failed}`, 'success');
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not send.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
        <div className="max-w-3xl mx-auto px-8 py-10 text-sm text-slate-500">
          Admin or MD access is required to send mass email.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail size={18} />
            Mass email
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            One-shot blast through mailbox/SMTP. Max 25 recipients per send, 100 successful sends per UTC day.
          </p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        <p className="text-sm text-slate-500">
          Remaining today: {remaining == null ? '…' : remaining}
        </p>
        <form onSubmit={send} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
          <label className="block text-xs text-slate-500">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Audience
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
            >
              <option value="leads">Leads with email</option>
              <option value="clients">Clients with email</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send now
          </button>
        </form>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No blasts yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((b) => (
              <li key={b.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <div className="font-medium text-slate-900 dark:text-white">{b.subject}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {b.audience} · sent {b.sent_count} · skipped {b.skipped_count} · failed {b.failed_count}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
