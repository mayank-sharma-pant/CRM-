'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Copy, Plus, Trash2 } from 'lucide-react';
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

export default function SandboxSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/sandbox');
      setStatus(res.data);
    } catch (err) {
      setError(formatError(err, 'Could not load sandbox status.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createSandbox = async () => {
    setBusy(true);
    try {
      const res = await api.post('/sandbox');
      setCredentials({
        email: res.data.admin_email,
        password: res.data.password,
        hint: res.data.login_hint,
        cloned: res.data.cloned,
      });
      showToast('Sandbox created', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create sandbox'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const destroySandbox = async () => {
    if (!window.confirm('Destroy the sandbox? Users will be disabled and you can create a new one later.')) {
      return;
    }
    setBusy(true);
    try {
      await api.delete('/sandbox');
      setCredentials(null);
      showToast('Sandbox destroyed', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not destroy sandbox'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied', 'success');
    } catch {
      showToast('Could not copy', 'error');
    }
  };

  if (!allowed) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-primary">Sandbox</h1>
        <p className="mt-2 text-secondary">Only admin or MD can manage the sandbox.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  const sandbox = status?.sandbox;
  const inSandbox = status?.is_sandbox;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary flex items-center gap-2">
          <Box className="h-6 w-6" />
          Sandbox
        </h1>
        <p className="mt-2 text-secondary text-sm">
          An isolated copy of this company for experiments. Live records are
          copied (capped at 100 per type). Log in with the sandbox admin —
          live data stays untouched.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      {inSandbox && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
          You are currently inside a sandbox
          {status.parent_name ? ` (parent: ${status.parent_name})` : ''}.
        </div>
      )}

      {credentials && (
        <div className="rounded-md border border-border bg-surface-elevated p-4 space-y-3">
          <p className="text-sm font-medium text-primary">Sandbox login (shown once)</p>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-secondary">Email</span>
            <span className="font-mono text-primary truncate">{credentials.email}</span>
            <button type="button" onClick={() => copyText(credentials.email)} className="p-1 text-secondary hover:text-primary" aria-label="Copy email">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-secondary">Password</span>
            <span className="font-mono text-primary truncate">{credentials.password}</span>
            <button type="button" onClick={() => copyText(credentials.password)} className="p-1 text-secondary hover:text-primary" aria-label="Copy password">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-secondary">{credentials.hint}</p>
          {credentials.cloned && (
            <p className="text-xs text-secondary">
              Copied {Object.entries(credentials.cloned)
                .filter(([, n]) => n > 0)
                .map(([k, n]) => `${n} ${k}`)
                .join(', ') || 'no CRM rows'}
            </p>
          )}
        </div>
      )}

      {!sandbox && !inSandbox && (
        <button
          type="button"
          disabled={busy}
          onClick={createSandbox}
          className="inline-flex items-center gap-2 rounded-md bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create sandbox
        </button>
      )}

      {sandbox && (
        <div className="rounded-md border border-border p-4 space-y-3">
          <div>
            <p className="font-medium text-primary">{sandbox.name}</p>
            <p className="text-sm text-secondary mt-1">
              Code {sandbox.company_code} · {sandbox.status}
              {sandbox.admin_email ? ` · ${sandbox.admin_email}` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={destroySandbox}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Destroy sandbox
          </button>
        </div>
      )}
    </div>
  );
}
