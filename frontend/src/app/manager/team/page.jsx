'use client';

/**
 * MANAGER TEAM VIEW
 * 
 * Purpose: List sales executives and their status.
 */

import { useState, useEffect } from 'react';
import { getTeamMembers } from '../../../lib/adapters/manager-adapter';
import {
    Users,
    TrendingUp,
    MoreVertical,
    Mail,
    Phone
} from 'lucide-react';

export default function TeamPage() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        try {
            const data = await getTeamMembers();
            setTeam(data);
        } catch (error) {
            console.warn('Team fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Top Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            My Team
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage sales executives and performance
                        </p>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
                        Add Team Member
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading team...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {team.map((member) => (
                            <div key={member.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">{member.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Active Leads</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{member.activeLeads}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Conversion Rate</span>
                                        <span className="font-semibold text-emerald-600">{member.conversionRate}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-slate-500">Status</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide
                                    ${member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                member.status === 'Offline' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}
                                `}>
                                            {member.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                    <button className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors">
                                        <Mail size={16} /> Email
                                    </button>
                                    <button className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors">
                                        <Phone size={16} /> Call
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
