'use client';

import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../services/api';

const KIND_LABEL = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
  follow_up: 'Follow-up',
  whatsapp: 'WhatsApp',
  audit: 'Update',
};

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? iso : formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return iso;
  }
}

export default function ActivityFeed({ entityType, entityId, reloadKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/timeline/${entityType}/${entityId}`)
      .then((res) => {
        if (!cancelled) setItems(res.data.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          const detail = err.response?.data?.detail;
          setError(typeof detail === 'string' ? detail : 'Unable to load activity');
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, reloadKey]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <History size={16} className="text-slate-400" />
        Activity
      </h2>
      {loading && (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Loading activity…
        </p>
      )}
      {!loading && error && <p className="text-xs text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4 italic">No activity yet.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="relative space-y-8 pl-3 border-l-2 border-slate-100 dark:border-slate-700 ml-2">
          {items.map((item) => (
            <div key={item.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-600 ring-1 ring-slate-100 dark:ring-slate-700" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {formatWhen(item.occurred_at)}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {KIND_LABEL[item.kind] || item.kind}
                </p>
                {item.body && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {item.body}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div className="relative pl-6">
            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
            <p className="text-[10px] text-slate-400 italic">Start of timeline</p>
          </div>
        </div>
      )}
    </div>
  );
}
