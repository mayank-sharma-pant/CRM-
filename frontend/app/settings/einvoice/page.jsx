'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function EinvoiceSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [live, setLive] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/einvoice/connection');
      setLive(Boolean(res.data.live));
      setBaseUrl(res.data.base_url || '');
      setUsername(res.data.username || '');
      setClientId(res.data.client_id || '');
      setPasswordSet(Boolean(res.data.password_set));
      setClientSecretSet(Boolean(res.data.client_secret_set));
      setGstNumber(res.data.gst_number || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load e-invoice settings.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        base_url: baseUrl,
        username,
        client_id: clientId,
      };
      if (password.trim()) payload.password = password.trim();
      if (clientSecret.trim()) payload.client_secret = clientSecret.trim();
      const data = (await api.put('/einvoice/connection', payload)).data;
      setLive(Boolean(data.live));
      setBaseUrl(data.base_url || '');
      setUsername(data.username || '');
      setClientId(data.client_id || '');
      setPasswordSet(Boolean(data.password_set));
      setClientSecretSet(Boolean(data.client_secret_set));
      setPassword('');
      setClientSecret('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">Only admin or MD can configure e-invoice.</div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">
            <Link href="/settings" className="hover:underline">Settings</Link>
            {' / E-invoice'}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">GST e-invoice (IRN)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            NIC/IRP or GSP credentials. Without them, Generate IRN stays on the local stub.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={save} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded font-semibold ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {live ? 'Live' : 'Stub'}
              </span>
              {gstNumber && <span className="text-slate-500">Seller GSTIN: {gstNumber}</span>}
            </div>
            <label className="block text-xs">
              Base URL
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              />
            </label>
            <label className="block text-xs">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              />
            </label>
            <label className="block text-xs">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={passwordSet ? 'unchanged' : ''}
                className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              />
            </label>
            <label className="block text-xs">
              Client ID
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              />
            </label>
            <label className="block text-xs">
              Client secret
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={clientSecretSet ? 'unchanged' : ''}
                className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              />
            </label>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50">
              <FileText size={12} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
