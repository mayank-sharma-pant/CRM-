'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { leadsHomePath } from '../../lib/leadsPaths';

export default function LeadTrashPage() {
  const router = useRouter();
  const pathname = usePathname();
  const leadsHome = leadsHomePath(pathname);
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canPurge = user?.role === 'admin' || user?.role === 'md';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/leads/trash');
      setItems(res.data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load trash');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (id) => {
    await api.post(`/leads/${id}/restore`);
    await load();
  };

  const purge = async (id) => {
    if (!window.confirm('Permanently delete this lead? This cannot be undone.')) return;
    await api.post(`/leads/${id}/purge`);
    await load();
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push(leadsHome)}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold">Lead trash</h1>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">Trash is empty.</p>
        )}
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{row.name}</p>
                <p className="text-xs text-slate-500">{row.email || row.phone || 'No contact'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => restore(row.id)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg"
                >
                  Restore
                </button>
                {canPurge && (
                  <button
                    type="button"
                    onClick={() => purge(row.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg"
                  >
                    Delete forever
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          <Link href={leadsHome} className="underline">Back to leads</Link>
        </p>
      </div>
    </div>
  );
}
