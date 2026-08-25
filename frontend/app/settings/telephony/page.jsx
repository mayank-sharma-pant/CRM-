'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function TelephonySettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sid, setSid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [subdomain, setSubdomain] = useState('api.exotel.com');
  const [callerId, setCallerId] = useState('');
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/telephony/connection');
      setConfigured(Boolean(res.data.configured));
      setSid(res.data.sid || '');
      setSubdomain(res.data.subdomain || 'api.exotel.com');
      setCallerId(res.data.caller_id || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load telephony settings.');
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
      const payload = { sid, subdomain, caller_id: callerId };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      if (apiToken.trim()) payload.api_token = apiToken.trim();
      const data = (await api.put('/telephony/connection', payload)).data;
      setConfigured(Boolean(data.configured));
      setSid(data.sid || '');
      setCallerId(data.caller_id || '');
      setApiToken('');
      setApiKey('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">Only admin or MD can configure telephony.</div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">
            <Link href="/settings" className="hover:underline">Settings</Link>
            {' / Telephony'}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Click-to-call</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Exotel Connect: we dial the agent’s phone, then the customer. Set your user phone so you can be called.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={save} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <p className="text-xs text-slate-500">{configured ? 'Exotel is configured.' : 'Not configured yet.'}</p>
            <label className="block text-xs">
              Account SID
              <input value={sid} onChange={(e) => setSid(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
            </label>
            <label className="block text-xs">
              API key (defaults to SID)
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="optional" className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
            </label>
            <label className="block text-xs">
              API token
              <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder={configured ? 'unchanged' : ''} className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
            </label>
            <label className="block text-xs">
              Subdomain
              <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
            </label>
            <label className="block text-xs">
              ExoPhone / Caller ID
              <input value={callerId} onChange={(e) => setCallerId(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
            </label>
            <button type="submit" disabled={saving} className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
