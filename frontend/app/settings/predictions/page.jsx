'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

function bandPill(band) {
  if (band === 'high') return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300';
  if (band === 'med') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

export default function PredictionsSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [model, setModel] = useState(null);
  const [weights, setWeights] = useState(null);
  const [training, setTraining] = useState(false);

  const [churn, setChurn] = useState([]);
  const [bandFilter, setBandFilter] = useState('');

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [modelsRes, churnRes] = await Promise.all([
        api.get('/predictions/models'),
        api.get('/predictions/churn'),
      ]);
      const convert = (modelsRes.data.items || []).find((m) => m.kind === 'deal_convert') || null;
      setModel(convert);
      setChurn(churnRes.data.items || []);
    } catch (err) {
      setError(formatError(err, 'Could not load predictions.'));
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const train = async () => {
    setTraining(true);
    try {
      const res = await api.post('/predictions/train', { kind: 'deal_convert' });
      setWeights(res.data.weights || null);
      showToast(
        res.data.model === 'trained'
          ? `Trained on ${res.data.sample_count} closed deals`
          : `Not enough closed deals yet (have ${res.data.sample_count}); using base rate`,
        res.data.model === 'trained' ? 'success' : 'info',
      );
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not train model.'), 'error');
    } finally {
      setTraining(false);
    }
  };

  const visibleChurn = bandFilter ? churn.filter((c) => c.band === bandFilter) : churn;

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <p className="text-sm text-slate-500">Only admin or MD can manage predictions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            ← Settings
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Predictive AI</h1>
          <p className="text-sm text-slate-500 mt-1">
            A deal win-probability model learned from your closed deals, and churn risk from
            invoice history.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Brain size={14} /> Deal win-probability model
                </h2>
                <button
                  type="button"
                  onClick={train}
                  disabled={training}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  <RefreshCw size={12} className={training ? 'animate-spin' : ''} />
                  {training ? 'Training…' : 'Train now'}
                </button>
              </div>
              {model ? (
                <p className="text-xs text-slate-500">
                  Status: <span className="font-semibold">{model.model === 'trained' ? 'Trained' : 'Baseline (needs ≥10 closed deals with both wins and losses)'}</span>
                  {' · '}{model.sample_count} closed deals · base win rate {Math.round((model.base_rate || 0) * 100)}%
                </p>
              ) : (
                <p className="text-xs text-slate-400">No model yet — click Train now once you have closed deals.</p>
              )}

              {weights && Object.keys(weights).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Learned win-rates</p>
                  {Object.entries(weights).map(([feature, table]) => (
                    <div key={feature} className="text-xs">
                      <span className="font-mono text-slate-500">{feature}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(table).map(([val, rate]) => (
                          <span key={val} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {String(val)}: {Math.round(rate * 100)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle size={14} /> At-risk clients ({visibleChurn.length})
                </h2>
                <select
                  value={bandFilter}
                  onChange={(e) => setBandFilter(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">All bands</option>
                  <option value="high">High</option>
                  <option value="med">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              {visibleChurn.length === 0 ? (
                <p className="text-xs text-slate-400">No clients with invoice history yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {visibleChurn.map((c) => (
                    <li
                      key={c.client_id}
                      className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5"
                    >
                      <span className="text-slate-700 dark:text-slate-200">{c.client_name}</span>
                      <span className="flex items-center gap-2 text-slate-500">
                        <span>{c.days_since_last_invoice}d since last invoice</span>
                        <span className={`px-2 py-0.5 rounded font-semibold uppercase ${bandPill(c.band)}`}>{c.band}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
