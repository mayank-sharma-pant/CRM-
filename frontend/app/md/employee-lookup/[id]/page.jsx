'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    User,
    TrendingUp,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Zap,
    Briefcase,
    Target,
    BarChart3,
    Mail,
    Phone,
    Calendar
} from 'lucide-react';
import api from '@/services/api';
import {
    LineChart, Line, CartesianGrid, XAxis, Tooltip
} from 'recharts';
import ChartWrapper from '../../../../components/shared/ChartWrapper';


export default function EmployeeDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [trendTab, setTrendTab] = useState('sales');

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/md/employee-lookup/${id}`);
                setData(res.data);
            } catch (err) {
                if (err?.response?.status === 404) {
                    setError('Employee not found');
                } else {
                    setError('Failed to load employee data');
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchEmployee();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (error || !data?.employee) {
        return (
            <div className="mx-auto max-w-[1360px] px-6 py-12">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to Teams
                </button>
                <div className="bg-surface rounded-lg border border-border p-12 text-center">
                    <User size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-lg font-bold text-primary">{error || 'Employee not found'}</p>
                    <p className="text-sm text-muted mt-2">The employee ID may be invalid or does not belong to your company.</p>
                </div>
            </div>
        );
    }

    const emp = data.employee;
    const perf = data.performance || {};
    const teamPerf = data.team_performance || {};
    const trends = data.trends || { sales: [0,0,0,0,0,0,0], conversion: [0,0,0,0,0,0,0], activity: [0,0,0,0,0,0,0] };

    const leads = perf.leads || 0;
    const converted = perf.converted || 0;
    const convRate = leads > 0 ? Math.round((converted / leads) * 100) : 0;

    const kpis = [
        { label: 'Leads Handled', value: leads, icon: Target, color: 'text-blue-500' },
        { label: 'Conversions', value: converted, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Conversion Rate', value: `${convRate}%`, icon: BarChart3, color: 'text-violet-500' },
        { label: 'Team Avg Leads', value: teamPerf.avg_leads_per_member || 0, icon: Briefcase, color: 'text-amber-500' },
    ];

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="mx-auto max-w-[1360px] px-6 space-y-6 pb-12 bg-page min-h-screen">
            {/* Back Button */}
            <div className="pt-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors">
                    <ArrowLeft size={16} /> Back to Teams
                </button>
            </div>

            {/* Employee Header Card */}
            <div className="bg-surface rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                            <span className="text-2xl font-black text-accent">
                                {emp.name?.charAt(0) || '?'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-primary tracking-tight">{emp.name}</h1>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                                    emp.role === 'manager'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
                                }`}>
                                    {emp.role}
                                </span>
                                <span className="text-[12px] text-muted font-mono">ID: {emp.id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-right">
                        <div>
                            <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Team</div>
                            <div className="text-[15px] font-bold text-primary">{emp.team || 'Unassigned'}</div>
                        </div>
                        {emp.email && (
                            <div>
                                <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Email</div>
                                <div className="text-[13px] font-medium text-secondary truncate max-w-[200px]">{emp.email}</div>
                            </div>
                        )}
                        <div>
                            <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Status</div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span className="text-[13px] font-bold text-primary capitalize">{emp.status || 'active'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={i} className="bg-surface rounded-lg border border-border p-4 shadow-sm hover:bg-surface-elevated transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                                    <Icon size={16} className={kpi.color} />
                                </div>
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">{kpi.label}</span>
                            </div>
                            <div className="text-[26px] font-black text-primary tabular-nums leading-none">{kpi.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Trends Chart */}
            <div className="bg-surface rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">7-Day Activity Trends</h3>
                    <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                        {['sales', 'conversion', 'activity'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setTrendTab(tab)}
                                className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-tight transition-all ${
                                    trendTab === tab ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-[240px] w-full">
                    <ChartWrapper width="100%" height="100%">
                        <LineChart data={(trends[trendTab] || []).map((v, i) => ({ day: dayLabels[i] || `D${i+1}`, value: v }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                            <XAxis dataKey="day" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ChartWrapper>
                </div>
            </div>

            {/* Team Benchmark */}
            {teamPerf && (
                <div className="bg-surface rounded-lg border border-border shadow-sm p-6">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-4">Team Benchmark Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BenchmarkRow label="Avg Leads/Member" individual={leads} teamAvg={teamPerf.avg_leads_per_member || 0} />
                        <BenchmarkRow label="Avg Conversions/Member" individual={converted} teamAvg={teamPerf.avg_converted_per_member || 0} />
                        <BenchmarkRow label="Conversion Rate" individual={convRate} teamAvg={teamPerf.avg_conversion_rate || 0} suffix="%" />
                    </div>
                </div>
            )}
        </div>
    );
}

function BenchmarkRow({ label, individual, teamAvg, suffix = '' }) {
    const diff = individual - teamAvg;
    const isAbove = diff > 0;
    return (
        <div className="bg-surface-elevated/30 rounded-md border border-border p-4">
            <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">{label}</div>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-[9px] text-muted uppercase tracking-widest mb-0.5">Individual</div>
                    <div className="text-[20px] font-black text-primary tabular-nums">{individual}{suffix}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-muted uppercase tracking-widest mb-0.5">Team Avg</div>
                    <div className="text-[16px] font-bold text-secondary tabular-nums">{teamAvg}{suffix}</div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-black tabular-nums border ${
                    isAbove ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                           : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                }`}>
                    {isAbove ? '+' : ''}{typeof diff === 'number' ? diff.toFixed(0) : diff}{suffix}
                </div>
            </div>
        </div>
    );
}
