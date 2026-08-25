'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function WhatsAppSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [cadenceTemplateId, setCadenceTemplateId] = useState('');
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('');
  const [variableKeys, setVariableKeys] = useState('name');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [conn, tpls] = await Promise.all([
        api.get('/whatsapp/connection'),
        api.get('/whatsapp/templates'),
      ]);
      setConfigured(Boolean(conn.data.configured));
      setSource(conn.data.source || '');
      setCadenceTemplateId(conn.data.cadence_template_id ? String(conn.data.cadence_template_id) : '');
      setItems(tpls.data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load WhatsApp settings.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConnection = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { source, cadence_template_id: cadenceTemplateId ? Number(cadenceTemplateId) : null };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      const data = (await api.put('/whatsapp/connection', payload)).data;
      setConfigured(Boolean(data.configured));
      setSource(data.source || '');
      setCadenceTemplateId(data.cadence_template_id ? String(data.cadence_template_id) : '');
      setApiKey('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save connection.');
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const keys = variableKeys.split(',').map((s) => s.trim()).filter(Boolean);
      await api.post('/whatsapp/templates', {
        name,
        provider_template_id: providerId,
        language: 'en',
        variable_keys: keys,
      });
      setName('');
      setProviderId('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create template.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/whatsapp/templates/${id}`);
    await load();
  };

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <p className="text-sm text-slate-500">Only admin or MD can manage WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-800">← Settings</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">WhatsApp templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gupshup approved templates only. Connection {configured ? 'is ready' : 'is not configured'}.
            Point Gupshup’s inbound webhook at <code className="text-xs">/api/whatsapp/webhook?source=YOUR_NUMBER</code>.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && <p className="text-sm text-red-600">{typeof error === 'object' ? JSON.stringify(error) : error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <form onSubmit={saveConnection} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Gupshup connection</h2>
              <label className="block text-xs">
                <span className="text-slate-500">Source WhatsApp number</span>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="917834811114"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">API key {configured ? '(leave blank to keep current)' : ''}</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">Cadence day-1 template (optional)</span>
                <select
                  value={cadenceTemplateId}
                  onChange={(e) => setCadenceTemplateId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                >
                  <option value="">Keep SMS for day 1</option>
                  {items.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save connection'}
              </button>
            </form>

            <form onSubmit={createTemplate} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add template</h2>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal name"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
              />
              <input
                required
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="Gupshup template id"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
              />
              <input
                value={variableKeys}
                onChange={(e) => setVariableKeys(e.target.value)}
                placeholder="variable keys, comma-separated (name, company)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                <MessageCircle size={12} />
                {creating ? 'Saving…' : 'Save template'}
              </button>
            </form>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Templates</h2>
              <ul className="space-y-3">
                {items.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{row.provider_template_id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="text-xs text-slate-400">No templates yet.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
