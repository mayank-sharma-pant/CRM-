'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import api from '../../services/api';
import { leadsHomePath } from '../../lib/leadsPaths';
import { useT } from '../../contexts/LocaleContext';
import KPICard from '../shared/KPICard';

const EMPTY_SUMMARY = {
  today: 0,
  upcoming: 0,
  overdue: 0,
  completed_week: 0,
  cancelled_week: 0,
  total_scheduled: 0,
};

const BUCKETS = [
  { id: 'all', label: 'All', bucket: null },
  { id: 'today', label: 'Today', bucket: 'today' },
  { id: 'upcoming', label: 'Upcoming', bucket: 'upcoming' },
  { id: 'overdue', label: 'Overdue', bucket: 'overdue' },
  { id: 'completed', label: 'Completed', bucket: 'completed' },
];

const STATUS_PILL = {
  scheduled: 'bg-accent-subtle text-accent',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
};

function apiDetail(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

function toLocalInput(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatStartsAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function parseLeadId(raw) {
  const trimmed = String(raw || '').trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function AppointmentsPage() {
  const pathname = usePathname();
  const leadsHome = leadsHomePath(pathname);
  const t = useT();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [bucket, setBucket] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [noticeKind, setNoticeKind] = useState('success');
  const [busyId, setBusyId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput());
  const [location, setLocation] = useState('');
  const [leadQuery, setLeadQuery] = useState('');
  const [leadId, setLeadId] = useState(null);
  const [leadName, setLeadName] = useState('');
  const [leadHits, setLeadHits] = useState([]);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const leadDebounceRef = useRef(null);
  const leadBoxRef = useRef(null);
  const listReqId = useRef(0);
  const leadSearchReqId = useRef(0);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/meetings/summary');
      setSummary({ ...EMPTY_SUMMARY, ...(res.data || {}) });
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, []);

  const loadList = useCallback(async ({ silent } = {}) => {
    const reqId = ++listReqId.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = { limit: 100 };
      const selected = BUCKETS.find((b) => b.id === bucket);
      if (selected?.bucket) params.bucket = selected.bucket;
      const res = await api.get('/meetings', { params });
      if (reqId !== listReqId.current) return;
      const data = res.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (reqId !== listReqId.current) return;
      setError(apiDetail(err, t('Could not load appointments.')));
      setItems([]);
    } finally {
      if (reqId === listReqId.current) setLoading(false);
    }
  }, [bucket]);

  const load = useCallback(async () => {
    await Promise.all([loadList(), loadSummary()]);
  }, [loadList, loadSummary]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handleClick = (e) => {
      if (leadBoxRef.current && !leadBoxRef.current.contains(e.target)) {
        setLeadSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const q = leadQuery.trim();
    clearTimeout(leadDebounceRef.current);
    const numericId = parseLeadId(q);
    if (numericId) {
      leadSearchReqId.current += 1;
      setLeadId(numericId);
      setLeadHits([]);
      setLeadSearchOpen(false);
      return undefined;
    }
    if (leadName) {
      leadSearchReqId.current += 1;
      setLeadHits([]);
      setLeadSearchOpen(false);
      return undefined;
    }
    if (q.length < 2) {
      leadSearchReqId.current += 1;
      setLeadHits([]);
      setLeadSearchOpen(false);
      setLeadId(null);
      return undefined;
    }
    leadDebounceRef.current = setTimeout(async () => {
      const reqId = ++leadSearchReqId.current;
      try {
        const res = await api.get('/leads', { params: { search: q, limit: 8 } });
        if (reqId !== leadSearchReqId.current) return;
        const hits = Array.isArray(res.data?.items) ? res.data.items : [];
        setLeadHits(hits);
        setLeadSearchOpen(true);
      } catch {
        if (reqId !== leadSearchReqId.current) return;
        setLeadHits([]);
        setLeadSearchOpen(false);
      }
    }, 300);
    return () => clearTimeout(leadDebounceRef.current);
  }, [leadQuery, leadName]);

  const resetForm = () => {
    setSubject('');
    setStartsAt(toLocalInput());
    setLocation('');
    setLeadQuery('');
    setLeadId(null);
    setLeadName('');
    setLeadHits([]);
    setLeadSearchOpen(false);
  };

  const onCreate = async (e) => {
    e.preventDefault();
    const startsIso = localInputToIso(startsAt);
    if (!startsIso) {
      setNoticeKind('error');
      setNotice(t('Enter a valid start time.'));
      return;
    }
    if (!leadId) {
      setNoticeKind('error');
      setNotice(t('Select a lead or enter a lead id.'));
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        subject: subject.trim(),
        starts_at: startsIso,
        location: location.trim() || null,
        lead_id: leadId,
      };
      await api.post('/meetings', payload);
      setNoticeKind('success');
      setNotice(t('Appointment created.'));
      setFormOpen(false);
      resetForm();
      await Promise.all([loadList({ silent: true }), loadSummary()]);
    } catch (err) {
      setNoticeKind('error');
      setNotice(apiDetail(err, t('Could not create appointment.')));
    } finally {
      setSaving(false);
    }
  };

  const onStatus = async (id, status) => {
    setBusyId(id);
    setNotice(null);
    try {
      await api.patch(`/meetings/${id}`, { status });
      setNoticeKind('success');
      setNotice(status === 'completed' ? t('Appointment completed.') : t('Appointment cancelled.'));
      await Promise.all([loadList({ silent: true }), loadSummary()]);
    } catch (err) {
      setNoticeKind('error');
      setNotice(apiDetail(err, t('Could not update appointment.')));
    } finally {
      setBusyId(null);
    }
  };

  const pickLead = (lead) => {
    leadSearchReqId.current += 1;
    setLeadId(lead.id);
    setLeadName(lead.name || '');
    setLeadQuery(lead.name || String(lead.id));
    setLeadHits([]);
    setLeadSearchOpen(false);
  };

  const kpiValue = (key) => summary[key] ?? 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">{t('Appointments')}</h1>
            <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">
              {t('Meetings on your desk')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary text-[12px] px-3 py-1.5 gap-1.5"
            onClick={() => {
              setFormOpen((open) => !open);
              setNotice(null);
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('New Appointment')}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard label={t('Today')} value={kpiValue('today')} />
          <KPICard label={t('Upcoming')} value={kpiValue('upcoming')} />
          <KPICard label={t('Overdue')} value={kpiValue('overdue')} />
          <KPICard label={t('Completed (week)')} value={kpiValue('completed_week')} />
          <KPICard label={t('Cancelled (week)')} value={kpiValue('cancelled_week')} />
          <KPICard label={t('Total scheduled')} value={kpiValue('total_scheduled')} />
        </div>

        {formOpen && (
          <form onSubmit={onCreate} className="bg-surface rounded border border-border p-4 space-y-3 max-w-xl">
            <p className="text-[11px] font-black text-muted uppercase tracking-widest">{t('New Appointment')}</p>
            <label className="block">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('Subject')}</span>
              <input
                type="text"
                required
                maxLength={255}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full h-8 text-[12px] border border-border rounded-md px-2 bg-surface text-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('Starts at')}</span>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full h-8 text-[12px] border border-border rounded-md px-2 bg-surface text-primary"
              />
            </label>
            <div className="block" ref={leadBoxRef}>
              <label className="block">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('Lead')}</span>
                <input
                  type="text"
                  value={leadQuery}
                  onChange={(e) => {
                    setLeadQuery(e.target.value);
                    setLeadName('');
                    if (!parseLeadId(e.target.value)) setLeadId(null);
                  }}
                  placeholder={t('Search or lead id')}
                  className="mt-1 w-full h-8 text-[12px] border border-border rounded-md px-2 bg-surface text-primary"
                  autoComplete="off"
                />
              </label>
              {leadId && (
                <p className="text-[11px] text-muted mt-1">
                  {leadName ? `${leadName} (#${leadId})` : `#${leadId}`}
                </p>
              )}
              {leadSearchOpen && leadHits.length > 0 && (
                <ul className="mt-1 border border-border rounded-md bg-surface shadow-sm max-h-40 overflow-y-auto">
                  {leadHits.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-[12px] text-primary hover:bg-surface-elevated"
                        onClick={() => pickLead(lead)}
                      >
                        {lead.name}
                        <span className="text-muted ml-1">#{lead.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('Location')}</span>
              <input
                type="text"
                maxLength={255}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full h-8 text-[12px] border border-border rounded-md px-2 bg-surface text-primary"
              />
            </label>
            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn-primary text-[12px] px-3 py-1.5" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : t('Save')}
              </button>
              <button
                type="button"
                className="btn btn-secondary text-[12px] px-3 py-1.5"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                {t('Cancel')}
              </button>
            </div>
          </form>
        )}

        {notice && (
          <p className={`text-[13px] font-medium ${noticeKind === 'error' ? 'text-error' : 'text-success'}`}>
            {notice}
          </p>
        )}

        <div className="flex bg-surface-elevated p-1 rounded-md border border-border w-fit flex-wrap">
          {BUCKETS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={bucket === chip.id}
              onClick={() => setBucket(chip.id)}
              className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${
                bucket === chip.id
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
            <button type="button" onClick={() => load()} className="btn btn-primary">
              {t('Retry')}
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="py-12 text-center text-muted text-[13px] font-medium">{t('No appointments')}</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="bg-surface rounded border border-border overflow-hidden shadow-sm">
            <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-surface-elevated/50 border-b border-border">
              <div className="w-[28%] text-[10px] font-black text-muted uppercase tracking-widest">{t('Subject')}</div>
              <div className="w-[14%] text-[10px] font-black text-muted uppercase tracking-widest">{t('Status')}</div>
              <div className="w-[20%] text-[10px] font-black text-muted uppercase tracking-widest">{t('Starts at')}</div>
              <div className="w-[18%] text-[10px] font-black text-muted uppercase tracking-widest">{t('Lead')}</div>
              <div className="flex-1 text-[10px] font-black text-muted uppercase tracking-widest">{t('Actions')}</div>
            </div>
            <ul className="divide-y divide-border/50">
              {items.map((row) => {
                const status = String(row.status || '').toLowerCase();
                const pill = STATUS_PILL[status] || 'bg-surface-elevated text-muted';
                const canAct = status === 'scheduled';
                return (
                  <li key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-5 py-3">
                    <div className="w-full lg:w-[28%] min-w-0">
                      <p className="text-[13px] font-bold text-primary truncate">{row.subject}</p>
                      {row.location && <p className="text-[11px] text-muted truncate">{row.location}</p>}
                    </div>
                    <div className="w-full lg:w-[14%]">
                      <span className={`inline-flex text-[11px] font-semibold px-1.5 py-0.5 rounded ${pill}`}>
                        {t({ scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' }[status] || status)}
                      </span>
                    </div>
                    <div className="w-full lg:w-[20%] text-[12px] text-secondary">{formatStartsAt(row.starts_at)}</div>
                    <div className="w-full lg:w-[18%] min-w-0 text-[12px] text-secondary">
                      {row.lead_id && (row.lead_name || row.lead_id) ? (
                        <Link
                          href={`${leadsHome}/${row.lead_id}`}
                          className="text-[13px] font-bold text-primary hover:text-accent truncate block"
                        >
                          {row.lead_name || `#${row.lead_id}`}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      {canAct && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary text-[12px] px-3 py-1.5"
                            disabled={busyId === row.id}
                            onClick={() => onStatus(row.id, 'completed')}
                          >
                            {busyId === row.id ? <Loader2 size={14} className="animate-spin" /> : t('Complete')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary text-[12px] px-3 py-1.5"
                            disabled={busyId === row.id}
                            onClick={() => onStatus(row.id, 'cancelled')}
                          >
                            {t('Cancel')}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
