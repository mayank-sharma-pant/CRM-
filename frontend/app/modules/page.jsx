'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import api from '../../services/api';

export default function CustomModulesIndexPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/modules')
      .then((res) => {
        if (!cancelled) setItems(res.data.items || []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load modules.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} />
            Custom modules
          </h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-slate-500">No custom modules yet. Admins can create them in Settings.</p>
        )}
        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id}>
                <Link href={`/modules/${m.slug}`} className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white hover:border-blue-400">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
