'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';
import api from '../../services/api';
import { dealsHomePath, leadsHomePath } from '../../lib/leadsPaths';

const HREF = {
  import_csv: (path) => leadsHomePath(path),
  connect_email: () => '/settings/email',
  create_form: (path) => leadsHomePath(path),
  send_quote: (path) => dealsHomePath(path),
};

export default function OnboardingChecklist() {
  const pathname = usePathname() || '';
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/onboarding/status');
      setData(res.data);
      setError('');
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data || data.complete) return null;

  const seed = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/onboarding/sample-data');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load sample data.');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await api.post('/onboarding/dismiss');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-primary">Get to your first deal</h2>
          <p className="text-xs text-muted mt-0.5">
            A short setup so this CRM is not empty. Skip any time.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="text-xs text-muted hover:text-primary shrink-0"
        >
          Dismiss
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <ul className="space-y-2">
        {data.steps.map((step) => {
          const href = HREF[step.key] ? HREF[step.key](pathname) : null;
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <Circle size={16} className="text-muted shrink-0" />
              )}
              {step.key === 'sample_data' && !step.done ? (
                <button
                  type="button"
                  onClick={seed}
                  disabled={busy}
                  className="text-left font-medium text-accent hover:underline"
                >
                  {step.label}
                </button>
              ) : href && !step.done ? (
                <Link href={href} className="font-medium text-accent hover:underline">
                  {step.label}
                </Link>
              ) : (
                <span className={step.done ? 'text-muted' : 'text-primary'}>{step.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
