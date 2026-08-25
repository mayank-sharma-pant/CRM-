'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function currentUtcPeriod() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value ?? '—';
  return `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

function parseError(err, fallback) {
  const detail = err.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export default function ForecastReportPage() {
  const { user } = useAuth();
  const canEditQuota = ['admin', 'md', 'manager'].includes(user?.role);

  const [period, setPeriod] = useState(currentUtcPeriod);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/forecasting/report', {
        params: { year: period.year, month: period.month },
      });
      const items = res.data.items || [];
      setRows(items);
      const nextDrafts = {};
      items.forEach((row) => {
        nextDrafts[row.user_id] = row.quota ?? '0.00';
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setRows([]);
      setError(parseError(err, 'Unable to load forecast report.'));
    } finally {
      setLoading(false);
    }
  }, [period.year, period.month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const saveQuota = async (row) => {
    if (!canEditQuota) return;
    const raw = drafts[row.user_id];
    const amount = String(raw ?? '').trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      setError('Quota must be a number ≥ 0.');
      return;
    }
    setSavingUserId(row.user_id);
    setError(null);
    try {
      await api.put('/forecasting/quotas', {
        user_id: row.user_id,
        year: period.year,
        month: period.month,
        amount,
      });
      await loadReport();
    } catch (err) {
      setError(parseError(err, 'Could not save quota.'));
    } finally {
      setSavingUserId(null);
    }
  };

  const yearOptions = [];
  const baseYear = currentUtcPeriod().year;
  for (let y = baseYear - 2; y <= baseYear + 1; y += 1) {
    yearOptions.push(y);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
            <TrendingUp size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Forecast</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Monthly quota vs closed-won and weighted pipeline (UTC)</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button type="button" onClick={loadReport} className="text-xs font-bold text-red-600 underline">Retry</button>
          </div>
        )}

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Year
              <select
                value={period.year}
                onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
                className="mt-1 block w-28 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Month
              <select
                value={period.month}
                onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
                className="mt-1 block w-40 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-violet-500" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No users in scope for this period.</p>
        ) : (
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Quota</th>
                  <th className="py-3 px-4">Closed won</th>
                  <th className="py-3 px-4">Weighted pipeline</th>
                  <th className="py-3 px-4">Closed %</th>
                  <th className="py-3 px-4">Pipeline %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.full_name}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      {canEditQuota ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={drafts[row.user_id] ?? ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [row.user_id]: e.target.value }))}
                            onBlur={() => saveQuota(row)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            disabled={savingUserId === row.user_id}
                            className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm tabular-nums"
                            aria-label={`Quota for ${row.full_name}`}
                          />
                          {savingUserId === row.user_id && <Loader2 size={14} className="animate-spin text-violet-500" />}
                        </div>
                      ) : (
                        <span className="tabular-nums font-medium">{formatMoney(row.quota)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums">{formatMoney(row.closed_won)}</td>
                    <td className="py-3 px-4 tabular-nums">{formatMoney(row.open_weighted)}</td>
                    <td className="py-3 px-4 tabular-nums">{formatPct(row.closed_pct)}</td>
                    <td className="py-3 px-4 tabular-nums">{formatPct(row.pipeline_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
