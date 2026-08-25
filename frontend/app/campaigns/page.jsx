'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function CampaignsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('leads');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/campaigns');
      const rows = res.data.items || [];
      setItems(rows);
      setSelectedId((prev) => prev || rows[0]?.id || null);
    } catch (err) {
      setError(formatError(err, 'Could not load campaigns.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    api.get(`/campaigns/${selectedId}`).then((res) => {
      if (!cancelled) setDetail(res.data);
    }).catch(() => {
      if (!cancelled) setDetail(null);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/campaigns', { name, subject, body, audience });
      showToast('Campaign created', 'success');
      setName('');
      setSubject('');
      setBody('');
      setSelectedId(res.data.id);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create campaign.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await api.post(`/campaigns/${selectedId}/send`);
      showToast(`Sent ${res.data.sent}, skipped ${res.data.skipped}, failed ${res.data.failed}`, 'success');
      setDetail(res.data.campaign);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not send campaign.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.delete(`/campaigns/${id}`);
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete campaign.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail size={18} />
            Email campaigns
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            One message to leads or clients, sent through the CRM mailbox or SMTP. Max 50 recipients. Not Mailchimp.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              {allowed && (
                <form
                  onSubmit={create}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">New campaign</div>
                  <label className="block text-xs text-slate-500">
                    Name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
                    />
                  </label>
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
                    Create draft
                  </button>
                </form>
              )}
              <ul className="space-y-2">
                {items.length === 0 && (
                  <li className="text-sm text-slate-500">No campaigns yet.</li>
                )}
                {items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-4 rounded-xl border bg-white dark:bg-slate-800 ${
                        selectedId === c.id
                          ? 'border-blue-400'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{c.status} · {c.audience}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              {!detail ? (
                <p className="text-sm text-slate-500">Select a campaign.</p>
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{detail.name}</div>
                  <p className="text-xs text-slate-500">{detail.subject}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detail.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {allowed && detail.status === 'draft' && (
                      <button
                        type="button"
                        onClick={send}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Send
                      </button>
                    )}
                    {allowed && (
                      <button
                        type="button"
                        onClick={() => remove(detail.id)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                    <Link href="/settings/email" className="text-xs text-blue-600 self-center">
                      Mailbox settings
                    </Link>
                  </div>
                  {Array.isArray(detail.recipients) && detail.recipients.length > 0 && (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      {detail.recipients.map((r) => (
                        <li key={r.id} className="py-2 flex justify-between gap-2">
                          <span className="text-slate-700 dark:text-slate-300">{r.to_email || '(no email)'}</span>
                          <span className="text-slate-500">{r.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
