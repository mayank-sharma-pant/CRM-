'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2 } from 'lucide-react';
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

export default function CustomModulesSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modules, setModules] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [fields, setFields] = useState([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [options, setOptions] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/modules', { params: { include_inactive: true } });
      const items = res.data.items || [];
      setModules(items);
      setSelectedId((prev) => prev || items[0]?.id || null);
    } catch (err) {
      setError(formatError(err, 'Could not load modules.'));
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setFields([]);
      return;
    }
    let cancelled = false;
    api.get(`/modules/${selectedId}/fields`).then((res) => {
      if (!cancelled) setFields(res.data.items || []);
    }).catch(() => {
      if (!cancelled) setFields([]);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const createMod = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/modules', { name, slug });
      showToast('Module created', 'success');
      setName('');
      setSlug('');
      setSelectedId(res.data.id);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create module.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (mod) => {
    setBusy(true);
    try {
      await api.patch(`/modules/${mod.id}`, { is_active: !mod.is_active });
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not update module.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMod = async (mod) => {
    setBusy(true);
    try {
      await api.delete(`/modules/${mod.id}`);
      if (selectedId === mod.id) setSelectedId(null);
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete module.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addField = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      const payload = { name: fieldName, field_key: fieldKey, field_type: fieldType };
      if (fieldType === 'picklist') {
        payload.options = options.split(',').map((s) => s.trim()).filter(Boolean);
      }
      await api.post(`/modules/${selectedId}/fields`, payload);
      setFieldName('');
      setFieldKey('');
      setOptions('');
      const res = await api.get(`/modules/${selectedId}/fields`);
      setFields(res.data.items || []);
      showToast('Field added', 'success');
    } catch (err) {
      showToast(formatError(err, 'Could not add field.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
        <div className="max-w-3xl mx-auto px-8 py-10 text-sm text-slate-500">
          Admin or MD access is required to define custom modules.
        </div>
      </div>
    );
  }

  const selected = modules.find((m) => m.id === selectedId);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-blue-600">Settings</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Layers size={18} />
            Custom modules
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Company-defined objects with their own fields and records. Not extra fields on leads.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <>
            <form onSubmit={createMod} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">New module</div>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Module name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sites"
                  className="text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
                />
                <input
                  aria-label="Module slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="sites"
                  className="text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-50"
                >
                  <Plus size={12} /> Create
                </button>
              </div>
            </form>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Modules</div>
              {modules.length === 0 ? (
                <p className="text-xs text-slate-500">No modules yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {modules.map((mod) => (
                    <li key={mod.id} className="py-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(mod.id)}
                        className={`text-sm text-left ${selectedId === mod.id ? 'font-semibold text-blue-600' : 'text-slate-800 dark:text-slate-200'}`}
                      >
                        {mod.name} <span className="text-xs text-slate-500">/{mod.slug}</span>
                        {!mod.is_active && <span className="ml-2 text-xs text-amber-600">inactive</span>}
                      </button>
                      <div className="flex gap-2">
                        <Link href={`/modules/${mod.slug}`} className="text-xs text-blue-600">Open</Link>
                        <button type="button" disabled={busy} onClick={() => toggleActive(mod)} className="text-xs text-slate-500">
                          {mod.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" disabled={busy} onClick={() => removeMod(mod)} className="text-xs text-red-600" aria-label={`Delete ${mod.name}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected && (
              <form onSubmit={addField} className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Fields on {selected.name}</div>
                {fields.length === 0 ? (
                  <p className="text-xs text-slate-500">No fields yet. Records still need a title.</p>
                ) : (
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    {fields.map((f) => (
                      <li key={f.id}>{f.name} <span className="text-xs text-slate-500">({f.field_key}, {f.field_type})</span></li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <input aria-label="Field name" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="Kind" className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900" />
                  <input aria-label="Field key" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="kind" className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900" />
                  <select aria-label="Field type" value={fieldType} onChange={(e) => setFieldType(e.target.value)} className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900">
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="date">date</option>
                    <option value="picklist">picklist</option>
                  </select>
                  {fieldType === 'picklist' && (
                    <input aria-label="Picklist options" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Roof, Bath" className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 bg-white dark:bg-slate-900" />
                  )}
                  <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-50">Add field</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
