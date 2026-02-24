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
import { getLeads } from '../../../lib/adapters/leads-adapter';
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
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await getLeads();
        setAllLeads(data);
      } catch (err) {
        console.error("Failed to fetch leads", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  // Static Data Filtering Logic
  const getFilteredLeads = () => {
    if (activeTab === 'all') return allLeads;

    // "Active" group: New, Contacted, Qualified
    if (activeTab === 'active') {
      return allLeads.filter(l => ['New', 'Contacted', 'Qualified'].includes(l.status));
    }

    // Specific Status
    return allLeads.filter(l => l.status === activeTab);
  };

  const leads = getFilteredLeads();

  /**
   * Helper to determine the single most important engagement signal
   */
  const getEngagementSignal = (lead) => {
    const NOW = new Date();

    // 1. Critical Tasks (Highest Priority)
    if (lead.next_task) {
      const taskDate = parseISO(lead.next_task);
      const daysDiff = differenceInDays(taskDate, NOW);

      if (daysDiff < 0) return { text: 'Follow-up overdue', color: 'text-red-600 font-semibold' };
      if (daysDiff === 0) return { text: 'Follow-up today', color: 'text-emerald-600 font-semibold' };
    }

    // 2. Response Received (New Information)
    if (lead.last_response_at) {
      return { text: `Responded ${formatDistanceToNow(parseISO(lead.last_response_at), { addSuffix: true })}`, color: 'text-blue-600 font-medium' };
    }

    // 3. Awaiting Response (Stalled)
    if (lead.last_contacted_at) {
      const daysSinceContact = differenceInDays(NOW, parseISO(lead.last_contacted_at));
      // If contacted > 2 days ago and no response yet
      if (daysSinceContact > 2) return { text: 'Awaiting response', color: 'text-amber-600 font-medium' };
      // Recently contacted
      return { text: `Contacted ${daysSinceContact === 0 ? 'today' : daysSinceContact + ' days ago'}`, color: 'text-slate-500' };
    }

    // 4. Default -> Empty string (Silent)
    return { text: '', color: '' };
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Leads</h1>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-default">
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Tabs / Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-all">
        <div className="max-w-7xl mx-auto px-8 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter size={14} className="text-slate-400 mr-2 flex-shrink-0" />
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
          {leads.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No leads found in this view.</div>
          ) : (
            leads.map(lead => {
              const signal = getEngagementSignal(lead);
              const isMuted = ['Converted', 'Lost'].includes(lead.status);

              return (
                <Link
                  key={lead.id}
                  href={`/sales/lead-detail/${lead.id}`}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${isMuted ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  {/* Left: Identity */}
                  <div className="w-[30%] min-w-[180px]">
                    <p className={`text-[15px] font-semibold truncate ${isMuted ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                      {lead.name}
                    </p>
                    {lead.company && (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Briefcase size={10} /> {lead.company}
                      </p>
                    )}
                  </div>

                  {/* Center: Context */}
                  <div className="flex-1 flex items-center gap-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${STATUS_STYLES[lead.status] || STATUS_STYLES.New}`}>
                      {lead.status === 'Qualified' ? 'Follow-up' : lead.status}
                    </span>
                    {signal.text && (
                      <span className={`text-sm ${isMuted ? 'text-slate-400' : signal.color} truncate`}>
                        {signal.text}
                      </span>
                    )}
                  </div>

                  {/* Right: Action */}
                  <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

    </div>
  );
}
