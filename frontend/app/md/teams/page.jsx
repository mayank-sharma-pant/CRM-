'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import {
    Users, TrendingUp, Target, DollarSign, ChevronRight,
    Loader2, UserCircle, Briefcase, AlertTriangle, Activity,
    CheckCircle, ArrowUpRight
} from 'lucide-react';

function useCountUp(end, duration = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (typeof end !== 'number') return;
        let startTime, frame;
        const animate = (time) => {
            if (!startTime) startTime = time;
            const pct = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - pct, 4);
            setCount(Math.floor(end * ease));
            if (pct < 1) frame = requestAnimationFrame(animate);
            else setCount(end);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [end, duration]);
    return count;
}

function KPICard({ label, value, icon: Icon, color, bgColor, prefix = '', suffix = '', subtitle }) {
    const isNum = typeof value === 'number';
    const animVal = useCountUp(isNum ? value : 0);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${bgColor}`}>
                    <Icon size={18} className={color} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                    <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        {prefix}{isNum ? (value >= 1000 ? animVal.toLocaleString() : animVal) : value}{suffix}
                    </div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
                    {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </motion.div>
    );
}

function BreakdownBar({ label, value, total, color }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-28 truncate">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${color}`} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-8 text-right">{value}</span>
            <span className="text-[10px] text-slate-400 w-10 text-right">{pct}%</span>
        </div>
    );
}

export default function MDTeamsPage() {
    const router = useRouter();
    const [teamsData, setTeamsData] = useState(null);
    const [salesData, setSalesData] = useState(null);
    const [monitoringData, setMonitoringData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [teamsRes, salesRes, monRes] = await Promise.allSettled([
                    api.get('/md/teams'),
                    api.get('/md/sales'),
                    api.get('/md/monitoring'),
                ]);
                if (teamsRes.status === 'fulfilled') setTeamsData(teamsRes.value.data);
                if (salesRes.status === 'fulfilled') setSalesData(salesRes.value.data);
                if (monRes.status === 'fulfilled') setMonitoringData(monRes.value.data);
            } catch (err) {
                console.error('Failed to fetch MD teams data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading teams...</span>
                </div>
            </div>
        );
    }

    const teams = teamsData?.teams || [];
    const totalMembers = teams.reduce((s, t) => s + t.member_count, 0);
    const totalLeads = teams.reduce((s, t) => s + t.total_leads, 0);
    const totalConverted = teams.reduce((s, t) => s + (t.converted_leads || 0), 0);
    const totalRevenue = teams.reduce((s, t) => s + t.revenue, 0);
    const totalOrders = teams.reduce((s, t) => s + (t.order_count || 0), 0);
    const overallWinRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

    const salesSummary = salesData?.summary || {};
    const alerts = monitoringData?.alerts || [];
    const highSeverity = alerts.filter(a => a?.severity === 'High').length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Teams & Performance</h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Company-wide overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        <Users size={14} className="text-indigo-500" />
                        {teams.length} Team{teams.length !== 1 ? 's' : ''} &middot; {totalMembers} Members
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* Company-wide KPIs */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={14} className="text-slate-400" />
                        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Company Performance</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <KPICard label="Total Leads" value={totalLeads} icon={Target} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" />
                        <KPICard label="Client" value={totalConverted} icon={CheckCircle} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
                        <KPICard label="Win Rate" value={overallWinRate} icon={TrendingUp} color="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-900/20" suffix="%" />
                        <KPICard label="Revenue" value={Math.round(totalRevenue)} icon={DollarSign} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" prefix="₹" />
                        <KPICard label="Orders" value={totalOrders} icon={Briefcase} color="text-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-900/20" />
                        <KPICard label="Alerts" value={alerts.length} icon={AlertTriangle}
                            color={highSeverity > 0 ? 'text-red-500' : 'text-slate-400'}
                            bgColor={highSeverity > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'}
                            subtitle={highSeverity > 0 ? `${highSeverity} high severity` : 'All clear'} />
                    </div>
                </section>

                {/* Sales Deals Summary (from /md/sales) */}
                {salesSummary.total_deals != null && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={14} className="text-slate-400" />
                            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Deals Overview</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <KPICard label="Total Deals" value={salesSummary.total_deals || 0} icon={Briefcase} color="text-slate-700" bgColor="bg-slate-100 dark:bg-slate-700" />
                            <KPICard label="Active Deals" value={salesSummary.active || 0} icon={Activity} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" />
                            <KPICard label="Won" value={salesSummary.won || 0} icon={CheckCircle} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
                            <KPICard label="Deal Win Rate" value={salesSummary.win_rate || 0} icon={TrendingUp} color="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-900/20" suffix="%" />
                        </div>
                    </section>
                )}

                {/* Team-by-team comparison bars */}
                {teams.length > 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5">Leads by Team</h3>
                            <div className="space-y-3">
                                {teams.sort((a, b) => b.total_leads - a.total_leads).map(t => (
                                    <BreakdownBar key={t.id} label={t.name} value={t.total_leads} total={totalLeads || 1} color="bg-blue-500" />
                                ))}
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5">Revenue by Team</h3>
                            <div className="space-y-3">
                                {teams.sort((a, b) => b.revenue - a.revenue).map(t => (
                                    <BreakdownBar key={t.id} label={t.name} value={Math.round(t.revenue)} total={Math.round(totalRevenue) || 1} color="bg-emerald-500" />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Alerts (if any) */}
                {alerts.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Alerts</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                            {alerts.slice(0, 10).map((alert, i) => (
                                <div key={i} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${alert.severity === 'High' ? 'bg-red-500' : alert.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{alert.title || alert.message || 'Alert'}</p>
                                            {alert.description && <p className="text-[10px] text-slate-400 mt-0.5">{alert.description}</p>}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                        alert.severity === 'High' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                        : alert.severity === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}>
                                        {alert.severity || 'Info'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Team Cards */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={14} className="text-slate-400" />
                        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Team Details</h2>
                    </div>

                    {teams.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                            <p className="text-slate-400 text-sm">No teams configured yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {teams.map(team => (
                                <div key={team.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-sm transition-shadow">
                                    <button
                                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center">
                                                <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{team.name}</h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                                    Manager: {team.manager} &middot; {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden md:block">
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Leads</div>
                                                <div className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums">{team.total_leads}</div>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Conv %</div>
                                                <div className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums">{team.conversion_rate}%</div>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Revenue</div>
                                                <div className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums">
                                                    ₹{team.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>
                                            <div className="text-right hidden lg:block">
                                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Orders</div>
                                                <div className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums">{team.order_count}</div>
                                            </div>
                                            <ChevronRight size={16}
                                                className={`text-slate-400 transition-transform ${expandedTeam === team.id ? 'rotate-90' : ''}`} />
                                        </div>
                                    </button>

                                    {expandedTeam === team.id && (
                                        <div className="border-t border-slate-100 dark:border-slate-700">
                                            <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Team Members
                                            </div>
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                                {team.members.map(member => (
                                                    <div
                                                        key={member.id}
                                                        onClick={() => router.push(`/md/employee-lookup/${member.id}`)}
                                                        className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                                {member.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{member.full_name}</p>
                                                                <p className="text-[11px] text-slate-400">{member.email}</p>
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
                                                            <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                            <ChevronRight size={14} className="text-slate-400" />
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
                </section>
            </div>
        </div>
    );
}
