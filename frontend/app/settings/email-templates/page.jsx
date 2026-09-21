'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useT } from '../../../contexts/LocaleContext';
import api from '../../../services/api';

function canMutate(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function apiDetail(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

export default function EmailTemplatesPage() {
  const t = useT();
  const { user } = useAuth();
  const allowed = canMutate(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/email-templates');
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      setError(apiDetail(err, t('Could not load email templates.')));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api.post('/email-templates', { name, subject, body });
      setName('');
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      setFormError(apiDetail(err, t('Could not save email template.')));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    setFormError('');
    try {
      await api.delete(`/email-templates/${id}`);
      await load();
    } catch (err) {
      setFormError(apiDetail(err, t('Could not delete email template.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-muted hover:text-primary">
            ← {t('Settings')}
          </Link>
          <h1 className="text-xl font-bold text-primary tracking-tight mt-2 flex items-center gap-2">
            <Mail size={18} />
            {t('Email templates')}
          </h1>
          <p className="text-sm text-muted mt-1">
            {t('Reusable subject and body for email campaigns.')}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label={t('Loading')} />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-start gap-3 py-12">
            <p className="text-[13px] text-error font-medium">{error}</p>
            <button type="button" onClick={() => load()} className="btn btn-primary">
              {t('Retry')}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {formError && (
              <p className="text-[13px] text-error font-medium">{formError}</p>
            )}

            {allowed && (
              <form
                onSubmit={create}
                className="p-5 rounded-xl border border-border bg-surface space-y-3"
              >
                <div className="text-sm font-semibold text-primary">{t('New template')}</div>
                <label className="block text-xs text-muted">
                  {t('Name')}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input mt-1"
                  />
                </label>
                <label className="block text-xs text-muted">
                  {t('Subject')}
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="input mt-1"
                  />
                </label>
                <label className="block text-xs text-muted">
                  {t('Body')}
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    rows={5}
                    className="input mt-1"
                  />
                </label>
                <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
                  {t('Save')}
                </button>
              </form>
            )}

            {items.length === 0 ? (
              <p className="py-12 text-center text-muted text-[13px] font-medium">
                {t('No email templates yet')}
              </p>
            ) : (
              <ul className="bg-surface rounded border border-border overflow-hidden shadow-sm divide-y divide-border/50">
                {items.map((row) => (
                  <li key={row.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-primary truncate">{row.name}</p>
                      <p className="text-[12px] text-muted truncate mt-0.5">{row.subject}</p>
                      <p className="text-[12px] text-secondary whitespace-pre-wrap mt-2">{row.body}</p>
                    </div>
                    {allowed && (
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        disabled={busy}
                        className="btn btn-secondary text-xs shrink-0 disabled:opacity-50"
                      >
                        {t('Delete')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
