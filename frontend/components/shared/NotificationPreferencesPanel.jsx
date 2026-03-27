'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Package,
  DollarSign,
  CalendarDays,
  ShieldCheck,
  Settings2,
  Sparkles,
} from 'lucide-react';
import api from '@/services/api';

const CATEGORY_META = {
  general: {
    label: 'General',
    description: 'Core account and system notices.',
    Icon: Bell,
  },
  tasks: {
    label: 'Tasks',
    description: 'Assignments, due updates, and completions.',
    Icon: ClipboardCheck,
  },
  leads: {
    label: 'Leads',
    description: 'Lead assignment and status changes.',
    Icon: CheckCircle2,
  },
  inventory: {
    label: 'Inventory',
    description: 'Low-stock and stock movement alerts.',
    Icon: Package,
  },
  finance: {
    label: 'Finance',
    description: 'Invoice and ledger-related notifications.',
    Icon: DollarSign,
  },
  leave: {
    label: 'Leave',
    description: 'Leave request and approval updates.',
    Icon: CalendarDays,
  },
  approvals: {
    label: 'Approvals',
    description: 'User/team transfer and approval workflows.',
    Icon: ShieldCheck,
  },
  admin: {
    label: 'Admin',
    description: 'Administrative and platform governance notices.',
    Icon: Settings2,
  },
  ai: {
    label: 'AI',
    description: 'Assistant activity and execution updates.',
    Icon: Sparkles,
  },
};

function Toggle({ checked, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prefs, setPrefs] = useState({ available_categories: [], muted_categories: [] });

  const mutedSet = useMemo(() => new Set(prefs.muted_categories || []), [prefs.muted_categories]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/notifications/preferences');
      setPrefs({
        available_categories: Array.isArray(res.data?.available_categories) ? res.data.available_categories : [],
        muted_categories: Array.isArray(res.data?.muted_categories) ? res.data.muted_categories : [],
      });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const toggleCategory = async (category) => {
    if (category === 'general') {
      return;
    }
    const nextMuted = new Set(mutedSet);
    if (nextMuted.has(category)) {
      nextMuted.delete(category);
    } else {
      nextMuted.add(category);
    }
    const optimistic = Array.from(nextMuted).sort();
    const previous = prefs.muted_categories;
    setPrefs((prev) => ({ ...prev, muted_categories: optimistic }));
    setSuccess('');
    setError('');
    try {
      setSaving(true);
      await api.put('/notifications/preferences', { muted_categories: optimistic });
      setSuccess('Notification preferences updated.');
    } catch (err) {
      setPrefs((prev) => ({ ...prev, muted_categories: previous }));
      setError(err?.response?.data?.detail || 'Failed to update notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse">
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
        <div className="space-y-3">
          <div className="h-14 rounded bg-slate-100 dark:bg-slate-900/40" />
          <div className="h-14 rounded bg-slate-100 dark:bg-slate-900/40" />
          <div className="h-14 rounded bg-slate-100 dark:bg-slate-900/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Categories</h3>
        </div>
        <button
          type="button"
          onClick={fetchPreferences}
          disabled={saving}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-3 px-3 py-2 rounded border border-red-200 bg-red-50 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-3 px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="space-y-2">
        {prefs.available_categories.map((category) => {
          const meta = CATEGORY_META[category] || {
            label: category,
            description: 'Notification category',
            Icon: AlertTriangle,
          };
          const enabled = !mutedSet.has(category);
          const disabled = saving || category === 'general';
          const Icon = meta.Icon;
          return (
            <div
              key={category}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Icon size={14} className="text-slate-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {meta.label}
                    {category === 'general' ? (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                        Required
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{meta.description}</div>
                </div>
              </div>
              <Toggle
                checked={enabled}
                disabled={disabled}
                onClick={() => toggleCategory(category)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
