'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';
import api from '../../services/api';
import { leadsHomePath } from '../../lib/leadsPaths';
import { useT } from '../../contexts/LocaleContext';
import { useAuth } from '../../contexts/AuthContext';

const SMB_KEYS = new Set(['sample_data', 'import_csv', 'invite_teammate', 'connect_whatsapp']);
const DEMOTED_KEYS = new Set(['connect_email', 'create_form', 'send_quote']);

const HREF = {
  import_csv: (path) => leadsHomePath(path),
  invite_teammate: () => '/admin/users',
  connect_whatsapp: () => '/settings/whatsapp',
};

const TITLE = 'Get to your first claimed lead and WhatsApp reply';
const SUBTITLE = 'A short setup so nothing sits unread. Skip any time.';

export default function OnboardingChecklist() {
  const t = useT();
  const { user } = useAuth();
  const role = user?.role;
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
      setError(err.response?.data?.detail || t('Could not load sample data.'));
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

  const smbSteps = data.steps.filter((step) => SMB_KEYS.has(step.key));
  const demotedSteps = data.steps.filter((step) => DEMOTED_KEYS.has(step.key));

  const stepHref = (step) => {
    if (step.done || step.key === 'sample_data') return null;
    if (step.key === 'import_csv') return HREF.import_csv(pathname);
    if (step.key === 'invite_teammate' && role === 'admin') return HREF.invite_teammate();
    if (step.key === 'connect_whatsapp' && (role === 'admin' || role === 'md')) {
      return HREF.connect_whatsapp();
    }
    return null;
  };

  const renderStep = (step) => {
    const label = t(step.label);
    const href = stepHref(step);

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
            {label}
          </button>
        ) : href && !step.done ? (
          <Link href={href} className="font-medium text-accent hover:underline">
            {label}
          </Link>
        ) : (
          <span className={step.done ? 'text-muted' : 'text-primary'}>{label}</span>
        )}
      </li>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">{t(TITLE)}</h2>
          <p className="text-[13px] text-muted mt-0.5">{t(SUBTITLE)}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="text-xs text-muted hover:text-primary shrink-0"
        >
          {t('Dismiss')}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <ul className="space-y-2">
        {smbSteps.map((step) => renderStep(step))}
        {demotedSteps.map((step) => renderStep(step))}
      </ul>
    </div>
  );
}
