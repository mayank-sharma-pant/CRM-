'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Users,
    TrendingUp,
    Target,
    DollarSign,
    ChevronRight,
    Loader2,
    UserCircle
} from 'lucide-react';

export default function MDTeamsPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState(null);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await api.get('/md/teams');
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch MD teams', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    const teams = data?.teams || [];

    return (
        <div className="mx-auto max-w-[1360px] px-6 space-y-6 pb-12 bg-page min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Teams Overview</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">
                        Company-Wide Team Performance
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold text-muted uppercase tracking-tight">
                    <Users size={16} className="text-accent" />
                    {teams.length} Team{teams.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    label="Total Teams"
                    value={teams.length}
                    icon={<Users size={18} className="text-accent" />}
                />
                <KPICard
                    label="Total Members"
                    value={teams.reduce((s, t) => s + t.member_count, 0)}
                    icon={<UserCircle size={18} className="text-blue-500" />}
                />
                <KPICard
                    label="Total Leads"
                    value={teams.reduce((s, t) => s + t.total_leads, 0)}
                    icon={<Target size={18} className="text-violet-500" />}
                />
                <KPICard
                    label="Total Revenue"
                    value={`$${teams.reduce((s, t) => s + t.revenue, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign size={18} className="text-emerald-500" />}
                />
            </div>

            {/* Team Cards */}
            {teams.length === 0 ? (
                <div className="bg-surface rounded-md border border-border p-12 text-center">
                    <p className="text-muted text-sm">No teams configured yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {teams.map(team => (
                        <div key={team.id} className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                            {/* Team Header Row */}
                            <button
                                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-elevated/30 transition-all text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                                        <Users size={20} className="text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold text-primary">{team.name}</h3>
                                        <p className="text-[11px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                            Manager: {team.manager} • {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden md:block">
                                        <div className="text-[10px] text-muted uppercase tracking-widest font-black">Leads</div>
                                        <div className="text-[14px] font-black text-primary tabular-nums">{team.total_leads}</div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-[10px] text-muted uppercase tracking-widest font-black">Conv %</div>
                                        <div className="text-[14px] font-black text-primary tabular-nums">{team.conversion_rate}%</div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-[10px] text-muted uppercase tracking-widest font-black">Revenue</div>
                                        <div className="text-[14px] font-black text-primary tabular-nums">
                                            ${team.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-[10px] text-muted uppercase tracking-widest font-black">Orders</div>
                                        <div className="text-[14px] font-black text-primary tabular-nums">{team.order_count}</div>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className={`text-muted transition-transform ${expandedTeam === team.id ? 'rotate-90' : ''}`}
                                    />
                                </div>
                            </button>

                            {/* Expanded Member List */}
                            {expandedTeam === team.id && (
                                <div className="border-t border-border/50">
                                    <div className="px-6 py-2 bg-surface-elevated/20 text-[10px] font-black text-muted uppercase tracking-widest">
                                        Team Members
                                    </div>
                                    <div className="divide-y divide-border/30">
                                        {team.members.map(member => (
                                            <div
                                                key={member.id}
                                                onClick={() => router.push(`/md/employee-lookup/${member.id}`)}
                                                className="flex items-center justify-between px-6 py-3 hover:bg-surface-elevated/20 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                        {member.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-primary">{member.full_name}</p>
                                                        <p className="text-[11px] text-muted">{member.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                        member.role === 'manager'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
                                                    }`}>
                                                        {member.role}
                                                    </span>
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                                                    }`} />
                                                    <ChevronRight size={14} className="text-muted" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function KPICard({ label, value, icon }) {
    return (
        <div className="bg-surface rounded-md border border-border p-4 flex items-center gap-4 shadow-sm hover:bg-surface-elevated transition-colors">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                {icon}
            </div>
            <div>
                <div className="text-[10px] font-black text-muted uppercase tracking-widest">{label}</div>
                <div className="text-[20px] font-black text-primary tabular-nums leading-tight mt-0.5">{value}</div>
            </div>
        </div>
    );
}
