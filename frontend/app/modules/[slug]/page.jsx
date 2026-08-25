'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layers, Plus, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function CustomModuleRecordsPage() {
  const params = useParams();
  const slug = params?.slug;
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mod, setMod] = useState(null);
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [title, setTitle] = useState('');
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const list = await api.get('/modules');
      const found = (list.data.items || []).find((m) => m.slug === slug);
      if (!found) {
        setMod(null);
        setError('Module not found.');
        return;
      }
      setMod(found);
      const [fieldsRes, recsRes] = await Promise.all([
        api.get(`/modules/${found.id}/fields`),
        api.get(`/modules/${found.id}/records`),
      ]);
      setFields((fieldsRes.data.items || []).filter((f) => f.is_active));
      setRecords(recsRes.data.items || []);
    } catch (err) {
      setError(formatError(err, 'Could not load module.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const createRecord = async (e) => {
    e.preventDefault();
    if (!mod) return;
    setBusy(true);
    try {
      await api.post(`/modules/${mod.id}/records`, { title, values });
      setTitle('');
      setValues({});
      showToast('Record created', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create record.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeRecord = async (id) => {
    if (!mod) return;
    setBusy(true);
    try {
      await api.delete(`/modules/${mod.id}/records/${id}`);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete record.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} />
            {mod?.name || slug}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Custom module records.</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {loading && <div className="text-sm text-slate-500">Loading…</div>}
        {!loading && error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && mod && (
          <>
            <form onSubmit={createRecord} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">New record</div>
              <input
                aria-label="Record title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900"
              />
              {fields.map((f) => (
                <label key={f.id} className="block text-xs text-slate-500">
                  {f.name}
                  {f.field_type === 'picklist' ? (
                    <select
                      aria-label={f.name}
                      value={values[f.field_key] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                      className="mt-1 block w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">—</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      aria-label={f.name}
                      type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'}
                      value={values[f.field_key] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                      className="mt-1 block w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  )}
                </label>
              ))}
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-50">
                <Plus size={12} /> Add
              </button>
            </form>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {records.length === 0 ? (
                <p className="text-xs text-slate-500">No records yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {records.map((row) => (
                    <li key={row.id} className="py-3 flex justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{row.title}</div>
                        <div className="text-xs text-slate-500">
                          {fields.map((f) => `${f.name}: ${row.values?.[f.field_key] ?? '—'}`).join(' · ')}
                        </div>
                      </div>
                      <button type="button" disabled={busy} onClick={() => removeRecord(row.id)} className="text-red-600" aria-label={`Delete ${row.title}`}>
                        <Trash2 size={14} />
                      </button>
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
