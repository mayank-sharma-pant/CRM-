'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { normalizeLeadStatus } from '../../lib/leadStatus';
import { leadsHomePath } from '../../lib/leadsPaths';
import LeadModal from './LeadModal';
import LeadImportModal from './LeadImportModal';
import { useImportUndo } from '../shared/CsvImportModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useT } from '../../contexts/LocaleContext';
import Skeleton, { TableRowSkeleton } from '../shared/Skeleton';
import {
  Plus, ChevronRight, Filter, Briefcase, LayoutList, Upload, Undo2
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Leads' },
  { id: 'Active', label: 'Active' },
  { id: 'Converted', label: 'Client' },
  { id: 'Lost', label: 'Lost' }
];

const STATUS_STYLES = {
  'Active': 'bg-blue-50 text-blue-700 border-blue-200',
  'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lost': 'bg-gray-50 text-gray-500 border-gray-200'
};

export default function Leads() {
  const [activeTab, setActiveTab] = useState('Active');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(null);
  
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const basePath = leadsHomePath(pathname);
  const { showToast } = useNotification();
  const { user } = useAuth();
  const t = useT();
  const [formMeta, setFormMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);

  useEffect(() => {
    setNow(new Date());
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLeads();
  }, [activeTab]);

  useEffect(() => {
    api.get('/lead-forms')
      .then((res) => setFormMeta(res.data))
      .catch(() => setFormMeta(null));
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all leads for this user and filter locally to avoid backend enum capitalization mismatches
      const response = await api.get('/leads', { params: { limit: 500 } });
      const raw = response.data?.items ?? response.data;
      let data = Array.isArray(raw) ? raw : [];

      // Normalize statuses immediately
      data = data.map(l => ({ ...l, status: normalizeLeadStatus(l.status) }));

      if (activeTab !== 'all') {
        data = data.filter(l => l.status === activeTab);
      }

      setLeads(data);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setError('Unable to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const { canUndo, undo, undoing, refreshBatch } = useImportUndo('lead', fetchLeads);

  const formUrl = formMeta?.public_path
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${formMeta.public_path}`
    : '';
  const canEditForm = user?.role === 'admin' || user?.role === 'md';

  const copyFormLink = async () => {
    if (!formUrl) return;
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const copyWidgetSnippet = async () => {
    if (!formMeta?.embed_script_path) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const snippet = `<script src="${origin}${formMeta.embed_script_path}" async></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 1500);
    } catch {
      showToast('Could not copy widget snippet', 'error');
    }
  };

  const onDefaultTeamChange = async (e) => {
    const value = e.target.value ? Number(e.target.value) : null;
    try {
      const res = await api.patch('/lead-forms', { default_team_id: value });
      setFormMeta(res.data);
    } catch {
      showToast('Could not update form team', 'error');
    }
  };

  const filteredLeads = leads;

  const safeParseISO = (s) => {
    if (!s || typeof s !== 'string') return null;
    try {
      const d = parseISO(s);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const getEngagementSignal = (lead) => {
    if (!now) return { text: '', color: '' };
    const nextTaskDate = safeParseISO(lead.next_task);
    if (nextTaskDate) {
      const daysDiff = differenceInDays(nextTaskDate, now);
      if (daysDiff < 0) return { text: 'Follow-up overdue', color: 'text-red-600 font-semibold' };
      if (daysDiff === 0) return { text: 'Follow-up today', color: 'text-emerald-600 font-semibold' };
    }
    const lastResp = safeParseISO(lead.last_response_at);
    if (lastResp) return { text: `Responded ${formatDistanceToNow(lastResp, { addSuffix: true })}`, color: 'text-blue-600 font-medium' };
    const lastContact = safeParseISO(lead.last_contacted_at);
    if (lastContact) {
      const daysSinceContact = differenceInDays(now, lastContact);
      if (daysSinceContact > 2) return { text: 'Awaiting response', color: 'text-amber-600 font-medium' };
      return { text: `Contacted ${daysSinceContact === 0 ? 'today' : daysSinceContact + ' days ago'}`, color: 'text-slate-500' };
    }
    return { text: '', color: '' };
  };

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-page">
        <div className="bg-surface border-b border-border px-6 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 opacity-60" />
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="bg-surface rounded border border-border overflow-hidden">
                {[...Array(6)].map((_, i) => <TableRowSkeleton key={i} />)}
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</div>
          <button onClick={fetchLeads} className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight">{t('Retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page flex flex-col">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">{t('Leads Registry')}</h1>
            <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">Efficient Lead Tracking and Engagement</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-surface-elevated/50 border border-border rounded-md p-1 shadow-inner h-8">
              <div 
                className="p-1 rounded flex items-center justify-center bg-surface shadow-sm text-primary"
                title="List View"
              >
                <LayoutList size={14} strokeWidth={2.5} />
              </div>
            </div>
            
            {formMeta && (
              <div className="hidden md:flex items-center gap-2">
                {canEditForm && Array.isArray(formMeta.teams) && formMeta.teams.length > 0 && (
                  <select
                    value={formMeta.default_team_id ?? ''}
                    onChange={onDefaultTeamChange}
                    className="h-8 text-[11px] font-bold uppercase tracking-tight border border-border rounded-md px-2 bg-surface text-primary"
                    aria-label="Website form default team"
                  >
                    <option value="">No team</option>
                    {formMeta.teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={copyFormLink}
                  className="h-8 px-3 border border-border rounded-md text-[11px] font-bold uppercase tracking-tight text-primary hover:bg-surface-elevated"
                >
                  {copied ? t('Copied') : t('Website form')}
                </button>
                <button
                  type="button"
                  onClick={copyWidgetSnippet}
                  className="h-8 px-3 border border-border rounded-md text-[11px] font-bold uppercase tracking-tight text-primary hover:bg-surface-elevated"
                >
                  {copiedWidget ? t('Copied') : t('Chat widget')}
                </button>
              </div>
            )}
            <Link
              href={`${basePath}/trash`}
              className="h-8 px-3 border border-border rounded-md text-[11px] font-bold uppercase tracking-tight text-primary hover:bg-surface-elevated inline-flex items-center"
            >
              {t('Trash')}
            </Link>
            {canUndo && (
              <button
                type="button"
                onClick={undo}
                disabled={undoing}
                className="h-8 px-3 border border-border rounded-md text-[11px] font-bold uppercase tracking-tight text-primary hover:bg-surface-elevated inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Undo2 size={14} strokeWidth={2.5} /> {t('Undo last import')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="h-8 px-3 border border-border rounded-md text-[11px] font-bold uppercase tracking-tight text-primary hover:bg-surface-elevated inline-flex items-center gap-1.5"
            >
              <Upload size={14} strokeWidth={2.5} /> {t('Import CSV')}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
            >
              <Plus size={14} strokeWidth={2.5} /> {t('Add Lead')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Filter size={12} strokeWidth={2.5} className="text-muted mr-1.5 flex-shrink-0" />
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-tight rounded transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:bg-surface-elevated hover:text-primary'
                  }`}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-4 flex-1 w-full">
        <div className="bg-surface rounded border border-border overflow-hidden shadow-sm">
          <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-surface-elevated/50 border-b border-border">
            <div className="w-[30%] text-[10px] font-black text-muted uppercase tracking-widest">{t('Lead Entity')}</div>
            <div className="w-[20%] text-[10px] font-black text-muted uppercase tracking-widest text-center">{t('Status')}</div>
            <div className="flex-1 text-[10px] font-black text-muted uppercase tracking-widest">{t('Next Engagement')}</div>
            <div className="w-8"></div>
          </div>
          <div className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {filteredLeads.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-muted text-[13px] font-medium italic"
                >
                  {t('No leads found in this view.')}
                </motion.div>
              ) : (
                filteredLeads.map((lead, idx) => {
                  const signal = getEngagementSignal(lead);
                  const isMuted = ['Converted', 'Lost', 'Lost Client'].includes(lead.status);

                  return (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link href={`${basePath}/${lead.id}`} className={`flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/30 transition-all group ${isMuted ? 'opacity-50' : ''} ${idx % 2 !== 0 ? 'bg-surface-elevated/10' : ''}`}>
                        <div className="w-[30%] min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <p className={`text-[13px] font-bold truncate ${isMuted ? 'text-muted' : 'text-primary'}`}>{lead.name}</p>
                            {!lead.assigned_to_id && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shrink-0">Open</span>
                            )}
                          </div>
                          {lead.company && (
                            <p className="text-[11px] text-muted font-bold truncate flex items-center gap-1 opacity-70 uppercase tracking-tight">
                              <Briefcase size={10} strokeWidth={2.5} /> {lead.company}
                            </p>
                          )}
                        </div>
                        <div className="w-[20%] flex justify-center">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border shadow-sm ${STATUS_STYLES[lead.status] || STATUS_STYLES['Active']}`}>
                            {t(lead.status === 'Converted' ? 'Client' : lead.status)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {signal.text && (
                            <span className={`text-[12px] font-bold ${isMuted ? 'text-muted' : signal.color.replace('font-semibold', '').replace('font-medium', '')} truncate block`}>
                              {signal.text}
                            </span>
                          )}
                        </div>
                        <div className="text-muted group-hover:text-accent transition-all translate-x-0 group-hover:translate-x-1">
                          <ChevronRight size={14} strokeWidth={2.5} />
                        </div>
                      </Link>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-7 mt-3 flex items-center justify-between pb-6 w-full">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
         <span className="text-[10px] font-black text-muted uppercase tracking-widest">Real-time Pipeline Synchronized</span>
        </div>
        <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums">{filteredLeads.length} Items Indexed</span>
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchLeads}
      />
      <LeadImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onRefresh={() => { fetchLeads(); refreshBatch(); }}
      />
    </div>
  );
}
