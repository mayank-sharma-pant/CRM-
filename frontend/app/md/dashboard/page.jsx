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
    BrainCircuit,
    DollarSign,
    Activity,
    Award,
    Receipt,
    RefreshCw,
    Search,
    Calendar,
    Bell,
    ChevronRight,
    UserSearch
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export default function MDDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await api.get('/md/dashboard');

            // Map backend data to frontend structure if necessary
            // The backend returns kpis, pipelineSummary, financeSnapshot
            // We'll augment with default values for missing pieces for now
            const baseData = res.data;

            // If backend doesn't provide everything yet, we bridge it
            const fullData = {
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
                        { stage: 'Converted', count: baseData.pipelineSummary?.stageDistribution?.find(s => s.stage === 'Converted')?.count || 12, color: '#10b981' },
                        { stage: 'Qualified', count: baseData.pipelineSummary?.stageDistribution?.find(s => s.stage === 'Qualified')?.count || 34, color: '#6366f1' }
                    ]
                },
                clientSnapshot: baseData.clientSnapshot || {
                    growth: [
                        { date: 'Jan', count: 100 },
                        { date: 'Feb', count: 120 },
                        { date: 'Mar', count: 150 }
                    ],
                    status: { active: baseData.kpis?.find(k => k.label.includes('Clients'))?.value || 0, risk: 2 }
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
            console.error('Failed to fetch MD dashboard', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* STEP 2: TOP BAR */}
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Dashboard</h1>
                    <p className="text-[16px] text-slate-500 dark:text-slate-400 font-medium mt-1">Company-level performance signals.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Employee Lookup Button */}
                    <button
                        onClick={() => router.push('/md/employee-lookup')}
                        title="Employee Lookup"
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors"
                    >
                        <UserSearch size={16} className="text-slate-400" />
                        <span className="hidden sm:inline">Employee Lookup</span>
                    </button>

                    {/* Date Range Selector */}
                    <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors">
                        <Calendar size={18} className="text-slate-400" />
                        <span>Last 30 Days</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    <button title="Notifications" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 rounded-lg">
                        <Bell size={20} />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        title="Refresh Data"
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 rounded-lg"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* STEP 3: KPI STRIP (2 Rows x 4 Cols) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {data.kpis.map((kpi) => (
                    <div
                        key={kpi.id}
                        onClick={() => router.push(kpi.route || kpi.link || '#')}
                        className="relative bg-white dark:bg-slate-800 h-[110px] rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${getTrendCompactColor(kpi.trend)}`}>
                                {getTrendArrow(kpi.trend)} {kpi.change}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</span>
                            {kpi.subValue && <span className="text-[13px] text-slate-400 font-medium">{kpi.subValue}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-12 gap-5">

                {/* ROW 1: SALES MOMENTUM (8) + PIPELINE OVERVIEW (4) */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Sales Momentum</h3>
                        <LinkText href="/md/sales">View Sales Analytics</LinkText>
                    </div>
                    <div className="p-6 flex gap-6">
                        <div className="flex-1 h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.salesMomentum.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={12} />
                                    <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff' }} cursor={{ stroke: '#6366f1', strokeWidth: 1.5 }} />
                                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-[180px] flex flex-col justify-center gap-4 border-l border-slate-100 dark:border-slate-700 pl-6">
                            {data.salesMomentum.outcomes.map((outcome, i) => (
                                <div key={i}>
                                    <span className="block text-[12px] text-slate-500 mb-1">{outcome.stage}</span>
                                    <div className="text-[24px] font-bold" style={{ color: outcome.color }}>{outcome.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Pipeline Overview</h3>
                        <LinkText href="/md/leads">Open Funnel</LinkText>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="h-[140px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.pipelineSummary.stageDistribution} barSize={24}>
                                    <XAxis dataKey="stage" hide />
                                    <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                                        {data.pipelineSummary.stageDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#93c5fd'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            <InsightTile label="Top Stage" value={data.pipelineSummary.topStage} />
                            <InsightTile label="Stalled" value={data.pipelineSummary.stalledStage} highlight="amber" />
                        </div>
                    </div>
                </div>

                {/* ROW 2: CLIENT HEALTH (6) + INVOICE HEALTH (6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Client Health</h3>
                        <LinkText href="/md/clients">View Growth</LinkText>
                    </div>
                    <div className="p-6 flex gap-6">
                        <div className="flex-1 h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.clientSnapshot.growth}>
                                    <XAxis dataKey="date" hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }} />
                                    <Line type="step" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-[140px] space-y-3">
                            <div>
                                <span className="text-[12px] text-slate-400">Total Active</span>
                                <div className="text-[20px] font-bold text-slate-900 dark:text-white">{data.clientSnapshot.status.active}</div>
                            </div>
                            <div>
                                <span className="text-[12px] text-slate-400">At Risk</span>
                                <div className="text-[20px] font-bold text-amber-500">{data.clientSnapshot.status.risk}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Invoice Health</h3>
                        <LinkText href="/md/invoices">View All</LinkText>
                    </div>
                    <div className="p-6 flex items-center gap-8">
                        <div className="h-32 w-32 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.financeSnapshot.invoiceHealth} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                                        {data.financeSnapshot.invoiceHealth.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[18px] font-bold text-slate-700 dark:text-slate-300">
                                    {data.financeSnapshot.counts.paid + data.financeSnapshot.counts.outstanding}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <StatRow label="Paid" value={data.financeSnapshot.counts.paid} color="text-emerald-600" />
                            <StatRow label="Outstanding" value={data.financeSnapshot.counts.outstanding} color="text-amber-600" />
                            <StatRow label="Overdue" value={data.financeSnapshot.counts.overdue} color="text-red-600" />
                        </div>
                    </div>
                </div>

                {/* ROW 3: TREND WATCHLIST (6) + AI ASSISTANT (6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Trend Watchlist</h3>
                        <LinkText href="/md/monitoring">Monitoring Center</LinkText>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {data.trendWatchlist.map((trend, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-3">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{trend.name}</span>
                                <div className={`flex items-center gap-2 ${trend.trend === 'up' ? 'text-emerald-600' : trend.trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
                                    {trend.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span className="font-bold">{trend.delta}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-gradient-to-br from-indigo-50/30 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-indigo-600" size={20} />
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Strategy Assistant</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">AI Advisory</span>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 mb-4">
                            {data.aiBrief.slice(0, 2).map((insight) => (
                                <div key={insight.id} onClick={() => router.push(insight.link)} className="p-3 rounded-lg bg-white/60 dark:bg-slate-700/30 border border-indigo-50 dark:border-slate-600 hover:border-indigo-200 cursor-pointer transition-colors">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{insight.title}</h4>
                                        <ArrowUpRight size={14} className="text-indigo-400" />
                                    </div>
                                    <p className="text-[12px] text-slate-500 mt-1 line-clamp-1">{insight.summary}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/md/ai-assistant')} className="w-full py-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[13px] font-medium transition-colors shadow-sm">
                            <BrainCircuit size={16} /> Open Strategy Chat
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- SUBCOMPONENTS FOR DENSITY ---

// --- SUBCOMPONENTS ---

function InsightTile({ label, value, highlight }) {
    let valueColor = "text-slate-900 dark:text-white";
    if (highlight === 'amber') valueColor = "text-amber-600";
    if (highlight === 'red') valueColor = "text-red-600";

    return (
        <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{label}</span>
            <span className={`text-[14px] font-bold ${valueColor}`}>{value}</span>
        </div>
    );
}

function StatRow({ label, value, color }) {
    return (
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
            <span className="text-[13px] font-medium text-slate-500">{label}</span>
            <span className={`text-[15px] font-bold ${color}`}>{value}</span>
        </div>
    );
}

function LinkText({ href, children }) {
    const router = useRouter();
    return (
        <button onClick={() => router.push(href)} className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
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

function getTrendCompactColor(trend) {
    if (trend === 'up') return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (trend === 'down') return 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-700/50';
}

function getTrendArrow(trend) {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '•';
}

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
