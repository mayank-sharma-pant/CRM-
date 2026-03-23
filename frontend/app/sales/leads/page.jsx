'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import api from '../../../services/api';
import LeadModal from '../../../components/leads/LeadModal';
import {
  Plus, ChevronRight, Filter, Briefcase, LayoutList, LayoutGrid
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Leads' },
  { id: 'active', label: 'Active' },
  { id: 'New', label: 'New' },
  { id: 'Contacted', label: 'Contacted' },
  { id: 'Qualified', label: 'Follow-up' },
  { id: 'Closed', label: 'Closed' }
];

const BOARD_COLUMNS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost'];

const STATUS_STYLES = {
  'New': 'bg-slate-100 text-slate-600 border-slate-200',
  'Contacted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Qualified': 'bg-violet-50 text-violet-700 border-violet-200',
  'Proposal': 'bg-amber-50 text-amber-700 border-amber-200',
  'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lost': 'bg-gray-50 text-gray-500 border-gray-200',
  'Lost Client': 'bg-red-50 text-red-700 border-red-200'
};

export default function Leads() {
  const [viewMode, setViewMode] = useState('board'); // 'list' | 'board'
  const [activeTab, setActiveTab] = useState('active');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  
  const searchParams = useSearchParams();
  const basePath = usePathname(); // e.g., '/sales/leads'

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

      if (activeTab !== 'all' && activeTab !== 'active' && activeTab !== 'Closed') {
        params.status = activeTab;
      }

      const response = await api.get(url, { params });
      const raw = response.data?.items ?? response.data;
      let data = Array.isArray(raw) ? raw : [];

      if (activeTab === 'active') {
        data = data.filter(l => ['New', 'Contacted', 'Qualified', 'Proposal'].includes(l.status));
      } else if (activeTab === 'Closed') {
        data = data.filter(l => ['Converted', 'Lost', 'Lost Client'].includes(l.status));
      }

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
    } catch (err) {
      console.error(err);
      setLeads(previousLeads); // Revert on failure
      alert('Failed to update lead status.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="text-[13px] text-muted font-bold uppercase tracking-widest animate-pulse">Synchronizing leads...</div>
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
          <div className="w-[30%] text-[10px] font-black text-muted uppercase tracking-widest">Lead Entity</div>
          <div className="w-[20%] text-[10px] font-black text-muted uppercase tracking-widest text-center">Status</div>
          <div className="flex-1 text-[10px] font-black text-muted uppercase tracking-widest">Next Engagement</div>
          <div className="w-8"></div>
        </div>
        <div className="divide-y divide-border/50">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-muted text-[13px] font-medium italic">No leads found in this view.</div>
          ) : (
            filteredLeads.map((lead, idx) => {
              const signal = getEngagementSignal(lead);
              const isMuted = ['Converted', 'Lost', 'Lost Client'].includes(lead.status);

              return (
                <Link key={lead.id} href={`${basePath}/${lead.id}`} className={`flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/30 transition-all group ${isMuted ? 'opacity-50' : ''} ${idx % 2 !== 0 ? 'bg-surface-elevated/10' : ''}`}>
                  <div className="w-[30%] min-w-[180px]">
                    <p className={`text-[13px] font-bold truncate ${isMuted ? 'text-muted' : 'text-primary'}`}>{lead.name}</p>
                    {lead.company && (
                      <p className="text-[11px] text-muted font-bold truncate flex items-center gap-1 opacity-70 uppercase tracking-tight">
                        <Briefcase size={10} strokeWidth={2.5} /> {lead.company}
                      </p>
                    )}
                  </div>
                  <div className="w-[20%] flex justify-center">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border shadow-sm ${STATUS_STYLES[lead.status] || STATUS_STYLES['New']}`}>
                      {lead.status === 'Qualified' ? 'Follow-up' : lead.status}
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
              )
            })
          )}
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
                {colStatus === 'Qualified' ? 'Follow-up' : colStatus}
                <span className="text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded border border-border">{colLeads.length}</span>
              </h3>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-2 min-h-[100px] no-scrollbar">
              {colLeads.map(lead => {
                const signal = getEngagementSignal(lead);
                const isMuted = ['Converted', 'Lost', 'Lost Client'].includes(lead.status);

                return (
                  <div 
                    key={lead.id}
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
                  </div>
                )
              })}
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
