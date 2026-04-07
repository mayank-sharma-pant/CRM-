'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { normalizeLeadStatus } from '../../../lib/leadStatus';
import { downloadCSV } from '../../../services/export';
import LeadModal from '../../../components/leads/LeadModal';
import { useNotification } from '../../../contexts/NotificationContext';
import Skeleton, { TableRowSkeleton, CardSkeleton } from '../../../components/shared/Skeleton';
import {
  Plus, ChevronRight, Filter, Briefcase, LayoutList, LayoutGrid, Download, Upload
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Leads' },
  { id: 'Active', label: 'Active' },
  { id: 'Converted', label: 'Client' },
  { id: 'Lost', label: 'Lost' }
];

const BOARD_COLUMNS = ['Active', 'Converted', 'Lost'];

const STATUS_STYLES = {
  'Active': 'bg-blue-50 text-blue-700 border-blue-200',
  'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lost': 'bg-gray-50 text-gray-500 border-gray-200'
};

export default function Leads() {
  const [viewMode, setViewMode] = useState('board'); // 'list' | 'board'
  const [activeTab, setActiveTab] = useState('Active');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const searchParams = useSearchParams();
  const basePath = usePathname(); // e.g., '/sales/leads'
  const { showToast } = useNotification();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLeads();
  }, [activeTab]);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/leads';
      const params = {};

      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      const response = await api.get(url, { params: { ...params, limit: 500 } });
      const raw = response.data?.items ?? response.data;
      let data = Array.isArray(raw) ? raw : [];
      data = data.map((l) => ({ ...l, status: normalizeLeadStatus(l.status) }));

      setLeads(data);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setError('Unable to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    const leadToUpdate = leads.find(l => l.id.toString() === leadId);
    if (!leadToUpdate || leadToUpdate.status === newStatus) return;

    // Optimistic UI update
    const previousLeads = [...leads];
    setLeads(prev => prev.map(l => l.id.toString() === leadId ? { ...l, status: newStatus } : l));

    try {
      await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      showToast(`Lead moved to ${newStatus}`, 'success');
    } catch (err) {
      console.error(err);
      setLeads(previousLeads); // Revert on failure
      showToast('Failed to update lead status.', 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await api.post('/import/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(response.data.message || 'Import successful', 'success');
      fetchLeads();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to import CSV', 'error');
    } finally {
      setLoading(false);
      e.target.value = null; // reset input
    }
  };

  const tabFilteredLeads = useMemo(() => {
    return leads;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return tabFilteredLeads;
  }, [tabFilteredLeads]);

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
    const NOW = new Date();
    const nextTaskDate = safeParseISO(lead.next_task);
    if (nextTaskDate) {
      const daysDiff = differenceInDays(nextTaskDate, NOW);
      if (daysDiff < 0) return { text: 'Follow-up overdue', color: 'text-red-600 font-semibold' };
      if (daysDiff === 0) return { text: 'Follow-up today', color: 'text-emerald-600 font-semibold' };
    }
    const lastResp = safeParseISO(lead.last_response_at);
    if (lastResp) return { text: `Responded ${formatDistanceToNow(lastResp, { addSuffix: true })}`, color: 'text-blue-600 font-medium' };
    const lastContact = safeParseISO(lead.last_contacted_at);
    if (lastContact) {
      const daysSinceContact = differenceInDays(NOW, lastContact);
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
            {viewMode === 'list' ? (
                <div className="bg-surface rounded border border-border overflow-hidden">
                    {[...Array(6)].map((_, i) => <TableRowSkeleton key={i} />)}
                </div>
            ) : (
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[280px] space-y-3">
                            <Skeleton className="h-4 w-24 mb-4" />
                            {[...Array(3)].map((_, j) => <CardSkeleton key={j} />)}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</div>
          <button onClick={fetchLeads} className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight">Retry</button>
        </div>
      </div>
    );
  }

  // --- RENDERING VIEWS ---

  const renderListView = () => (
    <div className="max-w-[1400px] mx-auto px-6 py-4">
      <div className="bg-surface rounded border border-border overflow-hidden shadow-sm">
        <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-surface-elevated/50 border-b border-border">
          <div className="w-[25%] text-[10px] font-black text-muted uppercase tracking-widest">Lead Entity</div>
          <div className="w-[15%] text-[10px] font-black text-muted uppercase tracking-widest text-center">Status</div>
          <div className="w-[20%] text-[10px] font-black text-muted uppercase tracking-widest">Assigned To</div>
          <div className="flex-1 text-[10px] font-black text-muted uppercase tracking-widest">Next Engagement</div>
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
                No leads found in this view.
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
                    <Link key={lead.id} href={`${basePath}/${lead.id}`} className={`flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/30 transition-all group ${isMuted ? 'opacity-50' : ''} ${idx % 2 !== 0 ? 'bg-surface-elevated/10' : ''}`}>
                      <div className="w-[25%] min-w-[160px]">
                        <p className={`text-[13px] font-bold truncate ${isMuted ? 'text-muted' : 'text-primary'}`}>{lead.name}</p>
                        {lead.company && (
                          <p className="text-[11px] text-muted font-bold truncate flex items-center gap-1 opacity-70 uppercase tracking-tight">
                            <Briefcase size={10} strokeWidth={2.5} /> {lead.company}
                          </p>
                        )}
                      </div>
                      <div className="w-[15%] flex justify-center">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border shadow-sm ${STATUS_STYLES[lead.status] || STATUS_STYLES['Active']}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="w-[20%] min-w-0">
                        {lead.assigned_to_name ? (
                          <span className="text-[12px] font-bold text-primary truncate block">{lead.assigned_to_name}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border shadow-sm bg-amber-50 text-amber-700 border-amber-200">Open</span>
                        )}
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
  );

  const renderBoardView = () => (
    <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-1 overflow-x-auto gap-4 items-start min-h-[500px] no-scrollbar">
      {BOARD_COLUMNS.map(colStatus => {
        const colLeads = filteredLeads.filter(l => {
          if (colStatus === 'Lost') return l.status === 'Lost' || l.status === 'Lost Client';
          return l.status === colStatus;
        });

        return (
          <div 
            key={colStatus} 
            className="flex-shrink-0 w-[280px] bg-surface-elevated/50 rounded-lg border border-border p-3 flex flex-col max-h-[80vh]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colStatus)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                {colStatus === 'Converted' ? 'Client' : colStatus}
                <span className="text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded border border-border">{colLeads.length}</span>
              </h3>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-2 min-h-[100px] no-scrollbar">
              <AnimatePresence mode="popLayout">
                {colLeads.map(lead => {
                  const signal = getEngagementSignal(lead);
                  const isMuted = ['Converted', 'Lost', 'Lost Client'].includes(lead.status);

                  return (
                    <motion.div 
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`bg-surface border border-border rounded shadow-sm p-3 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-all ${isMuted ? 'opacity-70' : ''}`}
                    >
                      <Link href={`${basePath}/${lead.id}`} className="block">
                        <div className="flex justify-between items-start mb-1.5">
                          <p className={`text-[13px] font-bold ${isMuted ? 'text-muted' : 'text-primary'} leading-tight`}>{lead.name}</p>
                        </div>
                        
                        {lead.company && (
                          <p className="text-[11px] text-muted font-bold truncate flex items-center gap-1 opacity-70 uppercase tracking-tight mb-2">
                            <Briefcase size={10} strokeWidth={2.5} /> {lead.company}
                          </p>
                        )}

                        {signal.text && (
                          <div className={`mt-2 text-[10px] font-bold ${isMuted ? 'text-muted' : signal.color.replace('font-semibold', '').replace('font-medium', '')} bg-surface-elevated/50 px-2 py-1 rounded w-fit`}>
                            {signal.text}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page flex flex-col">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Leads Pipeline</h1>
            <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">Drag & Drop Pipeline Management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-surface-elevated/50 border border-border rounded-md p-1 shadow-inner h-8">
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1 rounded flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-surface shadow-sm text-primary' : 'text-muted hover:text-primary'}`}
                title="List View"
              >
                <LayoutList size={14} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setViewMode('board')} 
                className={`p-1 rounded flex items-center justify-center transition-all ${viewMode === 'board' ? 'bg-surface shadow-sm text-primary' : 'text-muted hover:text-primary'}`}
                title="Board View"
              >
                <LayoutGrid size={14} strokeWidth={2.5} />
              </button>
            </div>
            
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />

            <button
              onClick={() => downloadCSV('/export/leads', {}, 'leads_export.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-elevated text-muted hover:text-primary border border-border rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm"
              title="Export CSV"
            >
              <Download size={14} strokeWidth={2.5} /> Export
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-elevated text-muted hover:text-primary border border-border rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm"
              title="Import CSV"
            >
              <Upload size={14} strokeWidth={2.5} /> Import
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
            >
              <Plus size={14} strokeWidth={2.5} /> Add Lead
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
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'board' ? renderBoardView() : renderListView()}

      {viewMode === 'list' && (
        <div className="max-w-[1400px] mx-auto px-7 mt-3 flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
           <span className="text-[10px] font-black text-muted uppercase tracking-widest">Real-time Pipeline Synchronized</span>
          </div>
          <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums">{filteredLeads.length} Items Indexed</span>
        </div>
      )}

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchLeads}
      />
    </div>
  );
}
