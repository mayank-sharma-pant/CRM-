'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(0);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/privacy/retention');
      setDays(res.data.retention_days || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load retention settings.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.put('/privacy/retention', { retention_days: Number(days) });
      setDays(res.data.retention_days || 0);
      setMessage('Saved.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onApply = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/privacy/retention/apply');
      setMessage(`Erased ${res.data.erased} trashed lead(s).`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not apply retention.');
    } finally {
      setSaving(false);
    }
  };

  const onExportMe = async () => {
    try {
      const res = await api.get('/privacy/me');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not export your data.');
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Privacy (GDPR / DPDP)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Export or erase lead and client personal data. Tax invoices are not deleted.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8 space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-2">Your account</h2>
          <button type="button" onClick={onExportMe}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium">
            Download my data
          </button>
        </div>
        {allowed && (
          <form onSubmit={onSave} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
            {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
              <>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {message && <p className="text-sm text-emerald-700">{message}</p>}
                <label className="block text-sm font-medium">
                  Lead trash retention (days, 0 = off)
                  <input type="number" min={0} max={3650} value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="mt-1 w-40 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-transparent" />
                </label>
                <p className="text-xs text-slate-500">
                  Apply erases PII on leads already in trash older than this many days.
                </p>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md disabled:opacity-50">
                    Save
                  </button>
                  <button type="button" onClick={onApply} disabled={saving}
                    className="px-4 py-2 border border-slate-300 text-sm font-semibold rounded-md disabled:opacity-50">
                    Apply now
                  </button>
                </div>
              </>
            )}
          </form>
        )}
        {!allowed && <Link href="/settings" className="text-sm underline">Back to settings</Link>}
      </div>
    </div>
  );
}
