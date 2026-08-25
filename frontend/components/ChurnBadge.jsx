'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';

function bandClasses(band) {
  if (band === 'high') return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300';
  if (band === 'med') return 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
}

/** Client churn-risk badge. */
export default function ChurnBadge({ id }) {
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
      .get(`/clients/${id}/churn`)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading || error || !data) return null;
  if (data.risk === null || data.risk === undefined) return null; // no invoices

  const reasons = data.reasons || [];

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bandClasses(data.band)}`}
        aria-expanded={open}
      >
        <AlertTriangle size={12} />
        Churn {data.band}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="mt-2 w-64 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
          {reasons.map((r, i) => <p key={i}>{r}</p>)}
        </div>
      )}
    </div>
  );
}
