'use client';

import { useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';

function bandClasses(prob) {
  if (prob >= 0.66) return 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (prob >= 0.33) return 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
}

/** Deal win-probability badge. */
export default function PredictionBadge({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) return undefined;
    setLoading(true);
    setError(false);
    api
      .get(`/deals/${id}/prediction`)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <span className="text-xs text-slate-400">Win %…</span>;
  if (error || !data) return null;

  const prob = data.probability ?? 0;
  const pct = Math.round(prob * 100);
  const factors = data.factors || [];
  const isFallback = data.model === 'fallback';

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bandClasses(prob)}`}
        aria-expanded={open}
      >
        <Brain size={12} />
        Win {pct}%
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="mt-2 w-64 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs space-y-1">
          {isFallback ? (
            <p className="text-slate-400">Baseline estimate — train a model in Settings → Predictive AI for a fitted score.</p>
          ) : factors.length === 0 ? (
            <p className="text-slate-400">No contributing factors.</p>
          ) : (
            factors.map((f) => (
              <div key={`${f.feature}-${f.value}`} className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-mono text-slate-500">{f.feature}</span> {String(f.value)}
                </span>
                <span className={f.contribution < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                  {f.contribution >= 0 ? `+${f.contribution}` : f.contribution}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
