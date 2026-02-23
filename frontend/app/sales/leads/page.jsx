'use client';

/**
 * LEADS LIST PAGE - Static Execution Focus
 * 
 * Purpose: Frontend-only demo with robust static data.
 * Tabs: All | Active | New | Contacted | Follow-up | Converted | Lost
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import api from '../../../services/api';
import LeadModal from '../../../components/leads/LeadModal';
import {
  Plus,
  ChevronRight,
  Filter,
  Briefcase
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Leads' },
  { id: 'active', label: 'Active' },
  { id: 'New', label: 'New' },
  { id: 'Contacted', label: 'Contacted' },
  { id: 'Qualified', label: 'Follow-up' },
  { id: 'Converted', label: 'Converted' },
  { id: 'Lost', label: 'Lost' }
];

const STATUS_STYLES = {
  'New': 'bg-slate-100 text-slate-600 border-slate-200',
  'Contacted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Qualified': 'bg-violet-50 text-violet-700 border-violet-200',
  'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lost': 'bg-gray-50 text-gray-500 border-gray-200'
};

export default function Leads() {
  const [activeTab, setActiveTab] = useState('active');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [activeTab]);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/leads';
      const params = {};

      if (activeTab !== 'all' && activeTab !== 'active') {
        params.status = activeTab;
      }

      const response = await api.get(url, { params });
      const raw = response.data?.items ?? response.data;
      let data = Array.isArray(raw) ? raw : [];

      // If 'active', we still want New, Contacted, Qualified
      // The backend doesn't have an 'active' filter shortcut yet, so we can either add it to backend or filter here
      if (activeTab === 'active') {
        data = data.filter(l => ['New', 'Contacted', 'Qualified'].includes(l.status));
      }

      setLeads(data);
    } catch (error) {
      console.error("Failed to fetch leads", error);
      setError('Unable to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads;

  /**
   * Helper to determine the single most important engagement signal
   */
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

    // 1. Critical Tasks (Highest Priority)
    const nextTaskDate = safeParseISO(lead.next_task);
    if (nextTaskDate) {
      const daysDiff = differenceInDays(nextTaskDate, NOW);
      if (daysDiff < 0) return { text: 'Follow-up overdue', color: 'text-red-600 font-semibold' };
      if (daysDiff === 0) return { text: 'Follow-up today', color: 'text-emerald-600 font-semibold' };
    }

    // 2. Response Received (New Information)
    const lastResp = safeParseISO(lead.last_response_at);
    if (lastResp) {
      return { text: `Responded ${formatDistanceToNow(lastResp, { addSuffix: true })}`, color: 'text-blue-600 font-medium' };
    }

    // 3. Awaiting Response (Stalled)
    const lastContact = safeParseISO(lead.last_contacted_at);
    if (lastContact) {
      const daysSinceContact = differenceInDays(NOW, lastContact);
      // If contacted > 2 days ago and no response yet
      if (daysSinceContact > 2) return { text: 'Awaiting response', color: 'text-amber-600 font-medium' };
      // Recently contacted
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
          <button
            onClick={fetchLeads}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page">

      {/* Header: Precise & Integrated */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Leads Ledger</h1>
            <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">Pipeline Management Pipeline</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
          >
            <Plus size={14} strokeWidth={2.5} /> Add New Lead
          </button>
        </div>
      </div>

      {/* Tabs / Filter Bar: Compact Switchers */}
      <div className="bg-surface/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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

      {/* List: Swiss Design Table Style */}
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="bg-surface rounded border border-border overflow-hidden shadow-sm">
          {/* Table Header (Hidden on small screens, but used for visual alignment) */}
          <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-surface-elevated/50 border-b border-border">
            <div className="w-[30%] text-[10px] font-black text-muted uppercase tracking-widest">Lead Entity</div>
            <div className="w-[20%] text-[10px] font-black text-muted uppercase tracking-widest text-center">Status</div>
            <div className="flex-1 text-[10px] font-black text-muted uppercase tracking-widest">Next Engagement</div>
            <div className="w-8"></div>
          </div>

          <div className="divide-y divide-border/50">
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center text-muted text-[13px] font-medium italic">No matches found in the active lifecycle.</div>
            ) : (
              filteredLeads.map((lead, idx) => {
                const signal = getEngagementSignal(lead);
                const isMuted = ['Converted', 'Lost'].includes(lead.status);

                return (
                  <Link
                    key={lead.id}
                    href={`/sales/leads/${lead.id}`}
                    className={`flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/30 transition-all group ${isMuted ? 'opacity-50' : ''} ${idx % 2 !== 0 ? 'bg-surface-elevated/10' : ''}`}
                  >
                    {/* Left: Identity */}
                    <div className="w-[30%] min-w-[180px]">
                      <p className={`text-[13px] font-bold truncate ${isMuted ? 'text-muted' : 'text-primary'}`}>
                        {lead.name}
                      </p>
                      {lead.company && (
                        <p className="text-[11px] text-muted font-bold truncate flex items-center gap-1 opacity-70 uppercase tracking-tight">
                          <Briefcase size={10} strokeWidth={2.5} /> {lead.company}
                        </p>
                      )}
                    </div>

                    {/* Center: Context */}
                    <div className="w-[20%] flex justify-center">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border shadow-sm ${lead.status === 'Converted' ? 'bg-success/10 text-success border-success/20' :
                        lead.status === 'Lost' ? 'bg-muted/10 text-muted border-muted/20' :
                          lead.status === 'Qualified' ? 'bg-accent/10 text-accent border-accent/20' :
                            'bg-info/10 text-info border-info/20'
                        }`}>
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

                    {/* Right: Action */}
                    <div className="text-muted group-hover:text-accent transition-all translate-x-0 group-hover:translate-x-1">
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Action Strip: Integrated Sync Info */}
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Real-time Pipeline Synchronized</span>
          </div>
          <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums">{filteredLeads.length} Items Indexed</span>
        </div>
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchLeads}
      />
    </div>
  );
}

