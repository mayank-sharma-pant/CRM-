'use client';

/**
 * TEAM LEAD LEADS PAGE
 * 
 * Capability: View team leads only.
 * Scope: Strict Team Scope.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { Users, Filter, ChevronRight, Briefcase } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function TeamLeadLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                // Use Manager endpoint ensures team scope
                const response = await api.get('/manager/leads');
                setLeads(response.data.leads || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, []);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading leads...</div>;

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Team Leads</h1>
                        <p className="text-sm text-slate-500 mt-1">Monitor all leads assigned to your team</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {leads.map(lead => (
                            <Link
                                key={lead.id}
                                href={`/team-lead/leads/${lead.id}`}
                                className="block hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors p-5 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm">
                                            {lead.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                                                {lead.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <Briefcase size={12} />
                                                <span>{lead.company}</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-slate-400">Assigned to: {lead.assigned_to || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${lead.status === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {lead.status}
                                        </span>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
