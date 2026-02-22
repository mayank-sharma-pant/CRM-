'use client';

/**
 * MANAGER TEAM LEADS PAGE
 * 
 * Purpose: View and manage Team Leads.
 * Scope: Strict Team Scope (Backend Driven - api.get('/leads') returns team leads for Manager).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import api from '../../../services/api';
import {
    Plus,
    ChevronRight,
    Filter,
    Briefcase
} from 'lucide-react';

const TABS = [
    { id: 'all', label: 'All Team Leads' },
    { id: 'active', label: 'Active Pipeline' },
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

export default function ManagerLeads() {
    const [activeTab, setActiveTab] = useState('active');
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await api.get('/manager/leads');
            // Manager endpoint returns { leads: [...], total: N }
            setLeads(response.data.leads || []);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    // Static Logic for filtering the API data
    const getFilteredLeads = () => {
        if (activeTab === 'all') return leads;
        if (activeTab === 'active') {
            return leads.filter(l => ['New', 'Contacted', 'Qualified'].includes(l.status));
        }
        return leads.filter(l => l.status === activeTab);
    };

    const filteredLeads = getFilteredLeads();

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

        if (lead.next_task) {
            const taskDate = safeParseISO(lead.next_task);
            if (taskDate) {
                const daysDiff = differenceInDays(taskDate, NOW);
                if (daysDiff < 0) return { text: 'Follow-up overdue', color: 'text-red-600 font-semibold' };
                if (daysDiff === 0) return { text: 'Follow-up today', color: 'text-emerald-600 font-semibold' };
            }
        }

        if (lead.last_response_at) {
            const d = safeParseISO(lead.last_response_at);
            if (d) return { text: `Responded ${formatDistanceToNow(d, { addSuffix: true })}`, color: 'text-blue-600 font-medium' };
        }

        if (lead.last_contacted_at) {
            const d = safeParseISO(lead.last_contacted_at);
            if (!d) return { text: '', color: '' };
            const daysSinceContact = differenceInDays(NOW, d);
            // If contacted > 2 days ago and no response yet
            if (daysSinceContact > 2) return { text: 'Awaiting response', color: 'text-amber-600 font-medium' };
            // Recently contacted
            return { text: `Contacted ${daysSinceContact === 0 ? 'today' : daysSinceContact + ' days ago'}`, color: 'text-slate-500' };
        }

        // 4. Default -> Empty string (Silent)
        return { text: '', color: '' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
                <div className="text-sm text-slate-500 font-medium animate-pulse">Loading team leads...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page">
            {/* Header: Precise & Integrated */}
            <div className="bg-surface border-b border-border px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold text-primary tracking-tight">Team Leads</h1>
                    <Link
                        href="/manager/leads?action=new"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[13px] font-bold transition-all shadow-sm"
                    >
                        <Plus size={14} strokeWidth={3} />
                        Create Lead
                    </Link>
                </div>
            </div>

            {/* Filter Bar: Solid Activity Feed style */}
            <div className="bg-surface/80 backdrop-blur border-b border-border sticky top-0 z-10 transition-all">
                <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <Filter size={12} className="text-muted mr-3 flex-shrink-0" />
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === tab.id
                                ? 'bg-surface-elevated text-accent ring-1 ring-border'
                                : 'text-muted hover:text-secondary hover:bg-surface-elevated'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List: High Density Enterprise Rows */}
            <div className="max-w-7xl mx-auto px-6 py-6 transition-all">
                <div className="bg-surface border border-border rounded shadow-sm overflow-hidden divide-y divide-border/50">
                    {filteredLeads.length === 0 ? (
                        <div className="p-12 text-center text-muted text-[13px] font-medium italic">No matching team leads found.</div>
                    ) : (
                        filteredLeads.map(lead => {
                            const signal = getEngagementSignal(lead);
                            const isMuted = ['Converted', 'Lost'].includes(lead.status);

                            return (
                                <Link
                                    key={lead.id}
                                    href={`/manager/leads/${lead.id}`}
                                    className={`flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/20 transition-colors group ${isMuted ? 'opacity-60 saturate-[0.8]' : ''}`}
                                >
                                    {/* Left: Identity */}
                                    <div className="w-[35%] min-w-[200px]">
                                        <p className={`text-[13px] font-bold truncate tracking-tight ${isMuted ? 'text-muted' : 'text-primary group-hover:text-accent transition-colors'}`}>
                                            {lead.name}
                                        </p>
                                        <p className="text-[11px] text-muted font-medium truncate flex items-center gap-1.5 mt-0.5 opacity-80 uppercase tracking-wide">
                                            <Briefcase size={10} /> {lead.company || lead.company_name || 'Individual'}
                                        </p>
                                    </div>

                                    {/* Center: Context */}
                                    <div className="flex-1 flex items-center gap-8 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border tabular-nums ${STATUS_STYLES[lead.status] || STATUS_STYLES.New}`}>
                                            {lead.status === 'Qualified' ? 'Follow-up' : lead.status}
                                        </span>
                                        {signal.text && (
                                            <span className={`text-[13px] font-medium truncate ${isMuted ? 'text-muted' : signal.color}`}>
                                                {signal.text}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Action */}
                                    <div className="text-border-strong opacity-40 group-hover:opacity-100 group-hover:text-accent transition-all group-hover:translate-x-0.5">
                                        <ChevronRight size={14} strokeWidth={2.5} />
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>

                {/* Status Strip */}
                <div className="mt-4 flex items-center gap-4 text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">
                    <span>{filteredLeads.length} items listed</span>
                    <div className="w-1 h-1 bg-border rounded-full" />
                    <span>Real-time team scope sync</span>
                </div>
            </div>
        </div>
    );
}
