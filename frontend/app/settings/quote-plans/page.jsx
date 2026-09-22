'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Package } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
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

const emptyForm = {
  name: '',
  tagline: '',
  billing_interval: 'monthly',
  default_fee: '',
  fee_inclusive: true,
  scope_text: '',
};

export default function QuotePlansSettingsPage() {
  const { user } = useAuth();
  const allowed = canMutate(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/quote-plans');
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      setError(apiDetail(err, 'Could not load quote plans.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!allowed) return;
    setBusy(true);
    setFormError('');
    try {
      await api.post('/quote-plans', {
        name: form.name,
        tagline: form.tagline || null,
        billing_interval: form.billing_interval,
        default_fee: String(Number(form.default_fee) || 0),
        fee_inclusive: form.fee_inclusive,
        scope_text: form.scope_text || null,
        is_active: true,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(apiDetail(err, 'Could not save plan.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!allowed) return;
    setBusy(true);
    setFormError('');
    try {
      await api.delete(`/quote-plans/${id}`);
      await load();
    } catch (err) {
      setFormError(apiDetail(err, 'Could not delete plan.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-page pb-10">
      <div className="bg-surface border-b border-border px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/settings" className="text-xs font-semibold text-muted hover:text-primary">
            ← Settings
          </Link>
          <h1 className="text-xl font-bold text-primary mt-2">Quote plans</h1>
          <p className="text-sm text-muted mt-1">
            Saved plans (name, default price, scope) that sales can pick when creating a quotation.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {allowed && (
          <form onSubmit={create} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} className="text-muted" />
              <h2 className="text-sm font-semibold text-primary">Add plan</h2>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block md:col-span-2">
                <span className="block text-xs text-muted mb-1">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-page"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-xs text-muted mb-1">Tagline</span>
                <input
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-page"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-muted mb-1">Default fee (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.default_fee}
                  onChange={(e) => setForm((f) => ({ ...f, default_fee: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-page"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-muted mb-1">Billing</span>
                <select
                  value={form.billing_interval}
                  onChange={(e) => setForm((f) => ({ ...f, billing_interval: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-page"
                >
                  <option value="monthly">Monthly</option>
                  <option value="one_time">One time</option>
                </select>
              </label>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.fee_inclusive}
                  onChange={(e) => setForm((f) => ({ ...f, fee_inclusive: e.target.checked }))}
                />
                <span className="text-sm text-secondary">Default fee includes GST</span>
              </label>
              <label className="block md:col-span-2">
                <span className="block text-xs text-muted mb-1">Scope (one bullet per line)</span>
                <textarea
                  rows={5}
                  value={form.scope_text}
                  onChange={(e) => setForm((f) => ({ ...f, scope_text: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-page font-mono"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Save plan
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10 text-muted">
            <Loader2 className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">No plans yet. Add Starter / Pro / whatever your company sells.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-surface p-4 flex justify-between gap-4">
                <div>
                  <div className="font-semibold text-primary">{p.name}</div>
                  <div className="text-sm text-secondary mt-1">
                    ₹{Number(p.default_fee).toLocaleString('en-IN')}
                    {p.fee_inclusive ? ' incl. GST' : ' + GST'} · {p.billing_interval}
                    {!p.is_active ? ' · inactive' : ''}
                  </div>
                  {p.scope_text && (
                    <pre className="text-xs text-muted mt-2 whitespace-pre-wrap font-sans">{p.scope_text}</pre>
                  )}
                </div>
                {allowed && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(p.id)}
                    className="text-xs font-semibold text-red-600 hover:underline self-start"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
