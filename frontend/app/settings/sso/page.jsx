'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function SamlSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    idp_entity_id: '',
    idp_sso_url: '',
    idp_certificate_pem: '',
    enabled: false,
    acs_url: '',
    sp_entity_id: '',
    company_code: '',
    certificate_set: false,
  });

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/saml/config');
      const d = res.data || {};
      setForm({
        idp_entity_id: d.idp_entity_id || '',
        idp_sso_url: d.idp_sso_url || '',
        idp_certificate_pem: '',
        enabled: !!d.enabled,
        acs_url: d.acs_url || '',
        sp_entity_id: d.sp_entity_id || '',
        company_code: d.company_code || '',
        certificate_set: !!d.certificate_set,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load SAML settings.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        idp_entity_id: form.idp_entity_id,
        idp_sso_url: form.idp_sso_url,
        enabled: form.enabled,
      };
      if (form.idp_certificate_pem.trim()) {
        payload.idp_certificate_pem = form.idp_certificate_pem.trim();
      }
      await api.put('/saml/config', payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save SAML settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">Only company admins and managing directors can manage SAML.</p>
        <Link href="/settings" className="mt-4 inline-block text-sm underline">Back to settings</Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">SAML SSO</h1>
          <p className="text-sm text-slate-500 mt-1">
            Company IdP login for existing users. Paste ACS URL and SP entity ID into your IdP.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="text-sm space-y-1">
              <p><span className="text-slate-500">Company code</span> <span className="font-mono">{form.company_code || '—'}</span></p>
              <p><span className="text-slate-500">ACS URL</span> <span className="font-mono break-all">{form.acs_url || '—'}</span></p>
              <p><span className="text-slate-500">SP entity ID</span> <span className="font-mono break-all">{form.sp_entity_id || '—'}</span></p>
            </div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              IdP entity ID
              <input name="idp_entity_id" value={form.idp_entity_id} onChange={onChange} required
                className="mt-1 w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-transparent" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              IdP SSO URL
              <input name="idp_sso_url" value={form.idp_sso_url} onChange={onChange} required
                className="mt-1 w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-transparent" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              IdP certificate (PEM){form.certificate_set ? ' — already saved; paste to replace' : ''}
              <textarea name="idp_certificate_pem" value={form.idp_certificate_pem} onChange={onChange} rows={6}
                className="mt-1 w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm font-mono bg-transparent" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" checked={form.enabled} onChange={onChange} />
              Enable SAML login
            </label>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
