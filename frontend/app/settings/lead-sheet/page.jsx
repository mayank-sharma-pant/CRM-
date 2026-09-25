'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
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

export default function LeadSheetPage() {
  const t = useT();
  const { user } = useAuth();
  const allowed = canMutate(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const apply = (data) => {
    const next = data?.url || '';
    setUrl(next);
    setSavedUrl(next);
    setLastResult(data?.last_result || '');
    setLastSyncedAt(data?.last_synced_at || '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/import/sheets');
      apply(res.data);
    } catch (err) {
      setError(apiDetail(err, t('Could not load the Google Sheet connection.')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed, load]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const res = await api.put('/import/sheets', { url });
      apply(res.data);
    } catch (err) {
      setFormError(apiDetail(err, t('Could not save the Google Sheet link.')));
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setFormError('');
    try {
      const res = await api.post('/import/sheets/sync');
      setLastResult(res.data?.last_result || '');
      await load();
    } catch (err) {
      setFormError(apiDetail(err, t('Could not sync the Google Sheet.')));
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-page pb-10">
      <div className="bg-surface border-b border-border px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs font-semibold text-muted hover:text-primary">
            {t('Settings')}
          </Link>
          <h1 className="text-xl font-bold text-primary mt-2">{t('Google Sheet leads')}</h1>
          <p className="text-sm text-muted mt-1">
            {t('New rows with a new email or phone are added. Matching leads stay as they are.')}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6">
        {!allowed && (
          <p className="text-sm text-muted">{t('Only a company admin or director can connect a sheet.')}</p>
        )}

        {allowed && loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label={t('Loading')} />
          </div>
        )}

        {allowed && !loading && error && (
          <div className="flex flex-col items-start gap-3 py-12">
            <p className="text-[13px] text-error font-medium">{error}</p>
            <button type="button" onClick={() => load()} className="btn btn-primary">
              {t('Retry')}
            </button>
          </div>
        )}

        {allowed && !loading && !error && (
          <form onSubmit={save} className="p-5 rounded-xl border border-border bg-surface space-y-3">
            {formError && <p className="text-[13px] text-error font-medium">{formError}</p>}
            <label className="block text-xs text-muted">
              {t('Google Sheets link')}
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="input mt-1"
              />
            </label>
            <p className="text-xs text-muted">
              {t('Share the sheet as Anyone with the link can view. The first row must be column names, including a name column.')}
            </p>
            <p className="text-xs text-muted">
              {t('Sync now pulls the latest rows. The reminder job pulls them too. Google does not notify this CRM the moment a cell changes.')}
            </p>
            {lastResult && (
              <p className="text-sm text-primary">
                {t('Last sync')}: {lastResult}
                {lastSyncedAt ? ` · ${lastSyncedAt}` : ''}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn btn-primary">
                {t('Save')}
              </button>
              <button
                type="button"
                disabled={busy || !savedUrl}
                onClick={syncNow}
                className="btn btn-secondary"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {t('Sync now')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
