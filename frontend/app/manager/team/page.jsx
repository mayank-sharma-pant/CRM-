'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { ChevronRight, User, Mail, Users, TrendingUp, AlertCircle } from 'lucide-react';

export default function TeamListPage() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await api.get('/manager/team');
            setTeam(res.data.team || []);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-page">
                <div className="text-sm font-medium text-muted animate-pulse">Scanning team signals...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page">
            <div className="bg-surface border-b border-border px-6 py-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                        <Users className="text-accent" size={24} />
                        My Team
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage and monitor your sales personnel performance</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-blue-500 mb-2">
                            <Users size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Total Members</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">{team.length}</p>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-emerald-500 mb-2">
                            <TrendingUp size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Top Performer</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {team.length > 0 ? team.reduce((prev, current) => (prev.order_count > current.order_count) ? prev : current).full_name : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-amber-500 mb-2">
                            <AlertCircle size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Total Pipeline</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {team.reduce((sum, m) => sum + m.lead_count, 0)} Leads
                        </p>
                    </div>
                </div>

                {/* Team Roster */}
                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-surface-elevated/50">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-widest leading-none">Team Roster</h3>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                        {team.length === 0 ? (
                            <div className="p-12 text-center text-muted">No team members assigned yet.</div>
                        ) : (
                            team.map(member => (
                                <Link key={member.id} href={`/manager/team/${member.id}`}
                                    className="flex items-center gap-6 px-6 py-4 hover:bg-surface-elevated/20 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                        {member.full_name.charAt(0)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{member.full_name}</h4>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1.5 text-[11px] text-muted font-medium uppercase tracking-wide">
                                                <Mail size={10} /> {member.email}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-12 text-right px-8">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Leads</p>
                                            <p className="text-sm font-bold text-primary">{member.lead_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Orders</p>
                                            <p className="text-sm font-bold text-primary">{member.order_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Status</p>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                {member.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-border group-hover:text-accent transition-all group-hover:translate-x-1">
                                        <ChevronRight size={18} />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
