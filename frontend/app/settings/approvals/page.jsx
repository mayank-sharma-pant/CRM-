'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

export default function ApprovalSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dealThreshold, setDealThreshold] = useState('');
  const [discountThreshold, setDiscountThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/settings/approvals');
      setDealThreshold(res.data.deal_approval_amount_threshold ?? '');
      setDiscountThreshold(
        res.data.discount_approval_percent_threshold != null
          ? String(res.data.discount_approval_percent_threshold)
          : ''
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load approval settings.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/settings/approvals', {
        deal_approval_amount_threshold: dealThreshold === '' ? null : dealThreshold,
        discount_approval_percent_threshold: discountThreshold === '' ? null : Number(discountThreshold),
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">Admin or MD access required.</div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-700">← Settings</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <ShieldCheck size={20} /> Deal & discount approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Large deals and deep quote discounts require admin/MD approval before close or accept.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <label className="block">
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deal amount threshold (₹)</span>
              <input
                type="number"
                min={0}
                value={dealThreshold}
                onChange={(e) => setDealThreshold(e.target.value)}
                placeholder="Leave empty to disable"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Max discount off list (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={discountThreshold}
                onChange={(e) => setDiscountThreshold(e.target.value)}
                placeholder="Leave empty to disable"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save thresholds'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
