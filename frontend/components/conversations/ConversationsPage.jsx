'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useT } from '../../contexts/LocaleContext';
import LeadWhatsAppPanel from '../leads/LeadWhatsAppPanel';

const FILTERS = [
  { id: 'unanswered', label: 'Unanswered', unanswered: true },
  { id: 'all', label: 'All', unanswered: false },
];

function apiDetail(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

function threadKey(row) {
  if (row?.lead_id != null) return `lead:${row.lead_id}`;
  if (row?.client_id != null) return `client:${row.client_id}`;
  return `phone:${row?.phone || ''}`;
}

function formatLastAt(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatMessageTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ConversationsPage() {
  const t = useT();
  const [filter, setFilter] = useState('unanswered');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [clientMessages, setClientMessages] = useState([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState(null);
  const [clientRetry, setClientRetry] = useState(0);
  const listReqId = useRef(0);
  const selectionReqId = useRef(0);

  const selected = items.find((row) => threadKey(row) === selectedKey) || null;

  const loadList = useCallback(async ({ silent } = {}) => {
    const reqId = ++listReqId.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const selectedFilter = FILTERS.find((chip) => chip.id === filter);
      const res = await api.get('/whatsapp/threads', {
        params: { unanswered: Boolean(selectedFilter?.unanswered), skip: 0, limit: 50 },
      });
      if (reqId !== listReqId.current) return;
      const next = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(next);
      setSelectedKey((prev) => {
        if (prev && next.some((row) => threadKey(row) === prev)) return prev;
        return next[0] ? threadKey(next[0]) : null;
      });
    } catch (err) {
      if (reqId !== listReqId.current) return;
      setError(apiDetail(err, t('Could not load conversations.')));
      setItems([]);
      setSelectedKey(null);
    } finally {
      if (reqId === listReqId.current) setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const reqId = ++selectionReqId.current;
    const clientId = selected?.lead_id == null ? selected?.client_id : null;
    if (clientId == null) {
      setClientMessages([]);
      setClientError(null);
      setClientLoading(false);
      return undefined;
    }
    setClientLoading(true);
    setClientError(null);
    api.get('/whatsapp/messages', { params: { client_id: clientId } })
      .then((res) => {
        if (reqId !== selectionReqId.current) return;
        setClientMessages(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch((err) => {
        if (reqId !== selectionReqId.current) return;
        setClientError(apiDetail(err, t('Could not load conversations.')));
        setClientMessages([]);
      })
      .finally(() => {
        if (reqId === selectionReqId.current) setClientLoading(false);
      });
    return undefined;
  }, [selected?.lead_id, selected?.client_id, clientRetry, t]);

  const renderPane = () => {
    if (!selected) {
      return null;
    }
    if (selected.lead_id != null) {
      return (
        <LeadWhatsAppPanel
          key={selected.lead_id}
          leadId={selected.lead_id}
          leadPhone={selected.phone}
          onChanged={() => loadList({ silent: true })}
        />
      );
    }
    if (selected.client_id != null) {
      return (
        <div className="bg-surface rounded border border-border p-5">
          <p className="text-[11px] font-black text-muted uppercase tracking-widest mb-3">
            {t('Conversations')}
          </p>
          {clientLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label={t('Loading')} />
            </div>
          )}
          {!clientLoading && clientError && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[13px] text-error font-medium">{clientError}</p>
              <button type="button" onClick={() => setClientRetry((n) => n + 1)} className="btn btn-primary">
                {t('Retry')}
              </button>
            </div>
          )}
          {!clientLoading && !clientError && clientMessages.length === 0 && (
            <p className="text-[13px] text-muted font-medium">{t('No conversations yet')}</p>
          )}
          {!clientLoading && !clientError && clientMessages.length > 0 && (
            <ul className="space-y-3">
              {clientMessages.map((row) => (
                <li key={row.id} className="text-[12px]">
                  <p className="font-medium text-primary whitespace-pre-wrap break-words">
                    {row.body || row.to_phone || '—'}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-muted">
                    <span>
                      {row.direction || row.status}
                      {row.error ? ` — ${row.error}` : ''}
                    </span>
                    <span>{formatMessageTime(row.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    return (
      <div className="bg-surface rounded border border-border p-5 space-y-2">
        {selected.last_body && (
          <p className="text-[13px] text-primary whitespace-pre-wrap break-words">{selected.last_body}</p>
        )}
        <p className="text-[13px] text-muted font-medium">{t('There is no lead to reply on.')}</p>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-xl font-bold text-primary tracking-tight">{t('Conversations')}</h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        <div className="flex bg-surface-elevated p-1 rounded-md border border-border w-fit flex-wrap">
          {FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={filter === chip.id}
              onClick={() => setFilter(chip.id)}
              className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${
                filter === chip.id
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              {t(chip.label)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label={t('Loading')} />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</p>
            <button type="button" onClick={() => loadList()} className="btn btn-primary">
              {t('Retry')}
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="py-12 text-center text-muted text-[13px] font-medium">{t('No conversations yet')}</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-4 items-start">
            <ul className="bg-surface rounded border border-border overflow-hidden shadow-sm divide-y divide-border/50">
              {items.map((row) => {
                const key = threadKey(row);
                const isSelected = key === selectedKey;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected ? 'bg-accent/10' : 'hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-bold text-primary truncate">
                          {row.name || row.phone || '—'}
                        </p>
                        {row.unanswered && (
                          <span className="shrink-0 inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-subtle text-accent">
                            {t('Unanswered')}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted truncate mt-0.5">{row.last_body || '—'}</p>
                      <p className="text-[11px] text-muted mt-1">{formatLastAt(row.last_at)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="min-w-0">{renderPane()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
