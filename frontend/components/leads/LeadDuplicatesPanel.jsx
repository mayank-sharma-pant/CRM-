'use client';

import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function LeadDuplicatesPanel({ leadId, onMerged }) {
  const [items, setItems] = useState([]);
  const [merging, setMerging] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leadId) return;
    api.get('/leads/duplicates', { params: { lead_id: leadId } })
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, [leadId]);

  if (items.length === 0) return null;

  const merge = async (sourceId) => {
    if (!window.confirm('Merge this duplicate into the current lead? Notes and tasks move here; the other lead goes to Trash.')) {
      return;
    }
    setMerging(sourceId);
    setError(null);
    try {
      await api.post(`/leads/${leadId}/merge`, { source_id: sourceId });
      setItems(items.filter((i) => i.id !== sourceId));
      if (onMerged) await onMerged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Merge failed');
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 p-5">
      <h2 className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-3">
        Possible duplicates
      </h2>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-700 dark:text-slate-200 truncate">
              {row.name} {row.email ? `· ${row.email}` : ''} {row.phone ? `· ${row.phone}` : ''}
            </span>
            <button
              type="button"
              disabled={merging === row.id}
              onClick={() => merge(row.id)}
              className="shrink-0 px-3 py-1 text-xs font-medium bg-amber-700 text-white rounded-lg disabled:opacity-50"
            >
              {merging === row.id ? 'Merging…' : 'Merge into this lead'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
