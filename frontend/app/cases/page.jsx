'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bug } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

function canDelete(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function CasesPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowedDelete = canDelete(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [casesRes, formRes] = await Promise.all([
        api.get('/cases'),
        api.get('/cases/form'),
      ]);
      setItems(casesRes.data.items || []);
      setForm(formRes.data);
    } catch (err) {
      setError(formatError(err, 'Could not load cases.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/cases', { subject, body });
      showToast('Case opened', 'success');
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create case.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id, status) => {
    setBusy(true);
    try {
      await api.patch(`/cases/${id}`, { status });
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not update case.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.delete(`/cases/${id}`);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete case.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleForm = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const res = await api.patch('/cases/form', { is_active: !form.is_active });
      setForm(res.data);
    } catch (err) {
      showToast(formatError(err, 'Could not update web-to-case.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bug size={18} />
            Cases
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thin customer requests on a client — not a helpdesk product.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {form && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <div className="font-medium text-slate-900 dark:text-white">Web-to-case</div>
            <p className="text-xs text-slate-500 mt-1">
              Public form: {form.public_path} ({form.is_active ? 'active' : 'off'})
            </p>
            {allowedDelete && (
              <button
                type="button"
                onClick={toggleForm}
                disabled={busy}
                className="mt-2 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
              >
                {form.is_active ? 'Disable form' : 'Enable form'}
              </button>
            )}
          </div>
        )}
        <form onSubmit={create} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
          <div className="text-sm font-semibold">New case</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Subject"
            className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            placeholder="Details"
            className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
          />
          <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-50">
            Open case
          </button>
        </form>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No cases yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{c.subject}</div>
                <p className="text-xs text-slate-500 mt-1">{c.status} · {c.source}{c.requester_email ? ` · ${c.requester_email}` : ''}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{c.body}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['open', 'pending', 'closed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={busy || c.status === st}
                      onClick={() => setStatus(c.id, st)}
                      className="px-2 py-1 rounded-md text-xs border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                    >
                      {st}
                    </button>
                  ))}
                  {allowedDelete && (
                    <button type="button" disabled={busy} onClick={() => remove(c.id)} className="px-2 py-1 rounded-md text-xs border border-slate-300 disabled:opacity-50">
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
