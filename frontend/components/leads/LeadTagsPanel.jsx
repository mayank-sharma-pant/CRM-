'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import api from '../../services/api';

export default function LeadTagsPanel({ leadId, tags = [], onChanged }) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const current = Array.isArray(tags) ? tags : [];

  const save = async (next) => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/leads/${leadId}`, { tags: next });
      if (onChanged) await onChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save tags');
    } finally {
      setSaving(false);
    }
  };

  const addTag = async (e) => {
    e.preventDefault();
    const name = draft.trim().toLowerCase();
    if (!name) return;
    if (current.includes(name)) {
      setDraft('');
      return;
    }
    setDraft('');
    await save([...current, name]);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Tags</h2>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {current.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            <Tag size={10} />
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              disabled={saving}
              onClick={() => save(current.filter((t) => t !== name))}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {current.length === 0 && (
          <span className="text-xs text-slate-400">No tags yet.</span>
        )}
      </div>
      <form onSubmit={addTag} className="flex gap-2">
        <label className="sr-only" htmlFor={`tag-input-${leadId}`}>Add tag</label>
        <input
          id={`tag-input-${leadId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add tag"
          maxLength={40}
          className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
