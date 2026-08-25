'use client';

import { useState } from 'react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function ShareLinkControls({ kind, id, shareActive, onChange }) {
  const { showToast } = useNotification();
  const [busy, setBusy] = useState(false);
  const [localUrl, setLocalUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const basePath = kind === 'invoice' ? `/invoices/${id}/share` : `/quotes/${id}/share`;

  const mint = async () => {
    setBusy(true);
    try {
      const res = await api.post(basePath);
      const fullUrl = `${window.location.origin}${res.data.url}`;
      setLocalUrl(fullUrl);
      showToast('Share link ready', 'success');
      onChange?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not create share link', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await api.delete(basePath);
      setLocalUrl('');
      showToast('Share link revoked', 'success');
      onChange?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not revoke share link', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!localUrl) return;
    try {
      await navigator.clipboard.writeText(localUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const showActive = shareActive || localUrl;
  const mintLabel = showActive ? 'Regenerate' : 'Share link';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={mint}
          disabled={busy}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg disabled:opacity-50"
        >
          {mintLabel}
        </button>
        {showActive && (
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-[11px] font-bold uppercase rounded-lg disabled:opacity-50"
          >
            Revoke
          </button>
        )}
      </div>
      {shareActive && !localUrl && (
        <p className="text-xs text-slate-500">Link active — regenerate to get a new copyable URL.</p>
      )}
      {localUrl && (
        <div className="space-y-1">
          <p className="text-xs break-all text-slate-600 dark:text-slate-300">{localUrl}</p>
          <button
            type="button"
            onClick={copy}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
