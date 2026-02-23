'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useRouter } from 'next/navigation';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowUpRight,
    AlertTriangle,
    DollarSign,
    Activity,
    Award,
    Receipt,
    RefreshCw,
    Search,
    Calendar,
    Bell,
    ChevronRight,
    UserSearch,
    Users
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import KPICard from '../../../components/shared/KPICard';

export default function MDDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await api.get('/md/dashboard');
            const baseData = res.data;

            const fullData = {
                kpis: baseData.kpis || [],
                pipelineSummary: {
                    stageDistribution: baseData.pipelineSummary?.stageDistribution || [],
                    topStage: baseData.pipelineSummary?.topStage || 'N/A',
                    stalledStage: baseData.pipelineSummary?.stalledStage || 'N/A'
                },
                financeSnapshot: {
                    invoiceHealth: baseData.financeSnapshot?.invoiceHealth || [],
                    counts: baseData.financeSnapshot?.counts || { paid: 0, outstanding: 0, overdue: 0 }
                },
                ...baseData,
                salesMomentum: baseData.salesMomentum || {
                    trend: [
                        { date: 'Mon', revenue: 4000, sales: 2400 },
                        { date: 'Tue', revenue: 3000, sales: 1398 },
                        { date: 'Wed', revenue: 2000, sales: 9800 },
                        { date: 'Thu', revenue: 2780, sales: 3908 },
                        { date: 'Fri', revenue: 1890, sales: 4800 },
                        { date: 'Sat', revenue: 2390, sales: 3800 },
                        { date: 'Sun', revenue: 3490, sales: 4300 },
                    ],
                    outcomes: [
                        { stage: 'Converted', count: 12, color: '#10b981' },
                        { stage: 'Qualified', count: 34, color: '#6366f1' }
                    ]
                },
                clientSnapshot: baseData.clientSnapshot || {
                    growth: [
                        { date: 'Jan', count: 100 },
                        { date: 'Feb', count: 120 },
                        { date: 'Mar', count: 150 }
                    ],
                    status: { active: 0, risk: 2 }
                },
                trendWatchlist: baseData.trendWatchlist || [
                    { name: 'Lead Velocity', delta: '+12%', trend: 'up' },
                    { name: 'SLA Adherence', delta: '-3%', trend: 'down' }
                ],
                aiBrief: baseData.aiBrief || [
                    { id: 1, title: 'Strategic Capacity', summary: 'Team Alpha is at 95% capacity. Recommend load balancing.', link: '/md/monitoring' },
                    { id: 2, title: 'Revenue Risk', summary: '3 high-value invoices are overdue by 10+ days.', link: '/md/revenue' }
                ]
            };

            setData(fullData);
        } catch (err) {
            console.warn('Failed to fetch MD dashboard - falling back to mock data', err);
            // Robust Mock Data for MD Dashboard
            setData({
                kpis: [
                    { id: 1, label: 'Total Revenue', value: '$1.2M', change: '+12%', trend: 'up', route: '/md/revenue' },
                    { id: 2, label: 'Active Leads', value: '450', change: '+5%', trend: 'up', route: '/md/leads' },
                    { id: 3, label: 'Client Retention', value: '94%', change: '-2%', trend: 'down', route: '/md/clients' },
                    { id: 4, label: 'System Health', value: 'Optimal', change: 'Stable', trend: 'flat', route: '/md/monitoring' }
                ],
                salesMomentum: {
                    trend: [
                        { date: 'Mon', revenue: 4200, sales: 21 }, { date: 'Tue', revenue: 3800, sales: 19 },
                        { date: 'Wed', revenue: 5100, sales: 25 }, { date: 'Thu', revenue: 4700, sales: 23 },
                        { date: 'Fri', revenue: 6200, sales: 31 }, { date: 'Sat', revenue: 2500, sales: 12 },
                        { date: 'Sun', revenue: 1800, sales: 9 }
                    ],
                    outcomes: [
                        { stage: 'Converted', count: 42, color: '#10b981' },
                        { stage: 'Lost', count: 15, color: '#ef4444' }
                    ]
                },
                pipelineSummary: {
                    stageDistribution: [
                        { stage: 'Leads', count: 120 }, { stage: 'Qualified', count: 85 },
                        { stage: 'Negotiation', count: 45 }, { stage: 'Won', count: 32 }
                    ],
                    topStage: 'Qualified (85)',
                    stalledStage: 'Negotiation (10 days avg)'
                },
                clientSnapshot: {
                    growth: [{ date: 'Jan', count: 100 }, { date: 'Feb', count: 112 }, { date: 'Mar', count: 125 }],
                    status: { active: 125, risk: 4 }
                },
                financeSnapshot: {
                    invoiceHealth: [
                        { name: 'Paid', value: 85, color: 'emerald-600' },
                        { name: 'Due', value: 12, color: 'amber-500' },
                        { name: 'Overdue', value: 3, color: 'red-500' }
                    ],
                    counts: { paid: 145, outstanding: 24, overdue: 5 }
                },
                trendWatchlist: [
                    { name: 'Revenue Velocity', delta: '+14.2%', trend: 'up' },
                    { name: 'Lead Response Time', delta: '-12m', trend: 'up' },
                    { name: 'Market Sentiment', delta: '+3%', trend: 'up' }
                ],
                aiBrief: [
                    { id: 1, title: 'Strategic Growth', summary: 'Regional expansion in Segment B shows 22% higher yield.', link: '/md/monitoring' },
                    { id: 2, title: 'Efficiency Signal', summary: 'Automation in Team Alpha reduced latency by 18%.', link: '/md/monitoring' }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) return <DashboardSkeleton />;
    if (!data) return <div className="p-12 text-center text-error font-bold uppercase tracking-widest">CRITICAL DATA FAILURE: CONTACT SYSTEMS ADMIN</div>;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page">

            {/* TOP BAR: Integrated & Executive */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Executive Cockpit</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Strategic Performance Matrix</p>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Employee Lookup Button */}
                    <button
                        onClick={() => router.push('/md/employee-lookup')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all"
                    >
                        <UserSearch size={14} className="text-muted" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Lookup</span>
                    </button>

                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>L30D</span>
                    </button>

                    <div className="h-6 w-px bg-border mx-1"></div>

                    <button className="p-2 text-muted hover:text-primary transition-colors">
                        <Bell size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 text-muted hover:text-accent transition-colors"
                    >
                        <RefreshCw size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* KPI STRIP: High Density Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {data.kpis.map((kpi) => (
                    <KPICard
                        key={kpi.id}
                        label={kpi.label}
                        value={kpi.value}
                        subValue={kpi.subValue}
                        trend={kpi.trend}
                        change={kpi.change}
                        variant="md"
                        onClick={() => router.push(kpi.route || kpi.link || '#')}
                    />
                ))}
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-12 gap-5">

                {/* ROW 1: SALES MOMENTUM (8) + PIPELINE OVERVIEW (4) */}
                <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-accent" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Sales Momentum</h3>
                        </div>
                        <LinkText href="/md/sales">View Analytics</LinkText>
                    </div>
                    <div className="p-5 flex gap-6">
                        <div className="flex-1 h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.salesMomentum.trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                                    <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px border var(--color-border)', borderRadius: '4px', fontSize: '11px' }} cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1 }} />
                                    <Line type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="sales" stroke="var(--color-success)" strokeWidth={2.5} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-[160px] flex flex-col justify-center gap-4 border-l border-border pl-5">
                            {data.salesMomentum.outcomes.map((outcome, i) => (
                                <div key={i}>
                                    <span className="block text-[10px] text-muted font-black uppercase tracking-widest mb-0.5">{outcome.stage}</span>
                                    <div className="text-[20px] font-black tabular-nums font-mono" style={{ color: outcome.color }}>{outcome.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-info" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Pipeline Analysis</h3>
                        </div>
                        <LinkText href="/md/leads">Open Funnel</LinkText>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="h-[120px] w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.pipelineSummary.stageDistribution} barSize={16}>
                                    <XAxis dataKey="stage" hide />
                                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                        {data.pipelineSummary.stageDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--color-accent)' : 'var(--color-accent-subtle)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            <InsightTile label="Primary Stage" value={data.pipelineSummary.topStage} />
                            <InsightTile label="Stagnation Index" value={data.pipelineSummary.stalledStage} highlight="amber" />
                        </div>
                    </div>
                </div>

                {/* ROW 2: CLIENT HEALTH (6) + INVOICE HEALTH (6) */}
                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-success" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Client Retention</h3>
                        </div>
                        <LinkText href="/md/clients">Growth Matrix</LinkText>
                    </div>
                    <div className="p-5 flex gap-6">
                        <div className="flex-1 h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.clientSnapshot.growth}>
                                    <XAxis dataKey="date" hide />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: 'none', borderRadius: '4px', fontSize: '11px' }} />
                                    <Line type="step" dataKey="count" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-[120px] space-y-3">
                            <div>
                                <span className="text-[10px] text-muted font-black uppercase tracking-widest block mb-0.5">Total Active</span>
                                <div className="text-[18px] font-black text-primary tabular-nums">{data.clientSnapshot.status.active}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted font-black uppercase tracking-widest block mb-0.5">Risk Vectors</span>
                                <div className="text-[18px] font-black text-warning tabular-nums">{data.clientSnapshot.status.risk}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <Receipt size={16} className="text-error" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Finance Liquidity</h3>
                        </div>
                        <LinkText href="/md/invoices">View Ledger</LinkText>
                    </div>
                    <div className="p-5 flex items-center gap-8">
                        <div className="h-28 w-28 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.financeSnapshot.invoiceHealth} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                                        {data.financeSnapshot.invoiceHealth.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`var(--${entry.color.replace('emerald-600', 'success').replace('red-500', 'error').replace('amber-500', 'warning')})`} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[14px] font-black text-secondary tabular-nums">
                                    {(data.financeSnapshot.counts.paid || 0) + (data.financeSnapshot.counts.outstanding || 0)}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
                            <StatRow label="Invoiced" value={data.financeSnapshot.counts.paid} color="text-success" />
                            <StatRow label="Pending" value={data.financeSnapshot.counts.outstanding} color="text-warning" />
                            <StatRow label="Overdue" value={data.financeSnapshot.counts.overdue} color="text-error" />
                        </div>
                    </div>
                </div>

                {/* ROW 3: TREND WATCHLIST (6) + EXECUTIVE BRIEF (6) */}
                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-muted" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Trend Watchlist</h3>
                        </div>
                        <LinkText href="/md/monitoring">Command Center</LinkText>
                    </div>
                    <div className="divide-y divide-border/50">
                        {data.trendWatchlist.map((trend, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-surface-elevated/10 transition-colors">
                                <span className="text-[12px] font-bold text-secondary uppercase tracking-tight">{trend.name}</span>
                                <div className={`flex items-center gap-1.5 ${trend.trend === 'up' ? 'text-success' : trend.trend === 'down' ? 'text-error' : 'text-muted'}`}>
                                    {trend.trend === 'up' ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
                                    <span className="text-[13px] font-black tabular-nums">{trend.delta}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-accent/20 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/30 relative z-10">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Executive Brief</h3>
                    </div>
                    <div className="p-5 relative z-10">
                        <div className="space-y-2.5">
                            {data.aiBrief.slice(0, 2).map((insight) => (
                                <div key={insight.id} onClick={() => router.push(insight.link)} className="p-2.5 rounded border border-border bg-surface-elevated/20 hover:border-accent/40 cursor-pointer transition-all group">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-[12px] font-bold text-primary uppercase tracking-tight group-hover:text-accent transition-colors">{insight.title}</h4>
                                        <ArrowUpRight size={12} className="text-muted group-hover:text-accent transition-all" />
                                    </div>
                                    <p className="text-[11px] text-muted font-medium mt-1 line-clamp-1 leading-relaxed opacity-80">{insight.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- SUBCOMPONENTS FOR DENSITY ---

// --- SUBCOMPONENTS ---

function InsightTile({ label, value, highlight }) {
    return (
        <div className="flex justify-between items-center px-3 py-1.5 rounded border border-border bg-surface-elevated/10">
            <span className="text-[11px] font-bold text-muted uppercase tracking-tight">{label}</span>
            <span className={`text-[13px] font-black tabular-nums ${highlight === 'amber' ? 'text-warning' :
                highlight === 'red' ? 'text-error' :
                    'text-primary'
                }`}>{value}</span>
        </div>
    );
}

function StatRow({ label, value, color }) {
    return (
        <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-tight">{label}</span>
            <span className={`text-[13px] font-black tabular-nums ${color}`}>{value}</span>
        </div>
    );
}

function LinkText({ href, children }) {
    const router = useRouter();
    return (
        <button onClick={() => router.push(href)} className="text-[11px] font-black text-accent hover:text-accent-hover uppercase tracking-tight transition-all">
            {children}
        </button>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="h-10 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="grid grid-cols-4 gap-5 h-[110px]">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5 h-[340px]">
                <div className="col-span-8 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="col-span-4 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
    );
}

// --- UTILS ---

function getTrendBarColor(trend) {
    if (trend === 'up') return 'bg-emerald-500';
    if (trend === 'down') return 'bg-red-500';
    return 'bg-slate-400';
}

function getSeverityDot(severity) {
    if (severity === 'High') return 'bg-red-500 shadow shadow-red-200 dark:shadow-none';
    if (severity === 'Medium') return 'bg-amber-500 shadow shadow-amber-200 dark:shadow-none';
    return 'bg-blue-500';
}
