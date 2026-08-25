'use client';

import { useEffect, useState } from 'react';
import { Target, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';

const OP_LABELS = {
  eq: '=', ne: '≠', in: 'in', gt: '>', gte: '≥', lt: '<', lte: '≤',
  is_set: 'is set', is_empty: 'is empty',
};

/**
 * Live scoring badge for a lead or deal detail page.
 * entity: 'leads' | 'deals'
 */
export default function ScoreBadge({ entity, id }) {
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
      .get(`/${entity}/${id}/score`)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entity, id]);

  if (loading) {
    return <span className="text-xs text-slate-400">Score…</span>;
  }
  if (error || !data) return null;

  const matched = (data.breakdown || []).filter((b) => b.matched);
  const score = data.score ?? 0;
  const hasRules = (data.breakdown || []).length > 0;

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-expanded={open}
      >
        <Target size={12} className="text-slate-500" />
        Score {score}
        {hasRules && (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
      </button>
      {open && (
        <div className="mt-2 w-64 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs space-y-1">
          {!hasRules ? (
            <p className="text-slate-400">No scoring rules configured.</p>
          ) : matched.length === 0 ? (
            <p className="text-slate-400">No rules matched.</p>
          ) : (
            matched.map((b) => (
              <div key={b.rule_id} className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-mono text-slate-500">{b.field}</span>{' '}
                  {OP_LABELS[b.operator] || b.operator}
                  {b.value != null && ` ${b.value}`}
                </span>
                <span className={b.points < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                  {b.points >= 0 ? `+${b.points}` : b.points}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
