'use client';

import { useState, useEffect } from 'react';
import { MOCK_DATA } from '../../../services/mockData';
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
    ChevronRight
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export default function MDDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA['/md/dashboard']);
            setLoading(false);
        }, 400);
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
                        onClick={() => router.push(kpi.route)}
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
                        </div>
                    </div>
                ))}
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-12 gap-5">

                {/* PRIMARY ROW: REVENUE (8) + PIPELINE (4) */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
                        <div className="flex gap-2">
                            <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-[13px] font-medium text-slate-600 dark:text-slate-300">Avg: $12.4k/day</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={12} />
                                    <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}k`} dx={-4} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="mt-4 text-[14px] text-slate-500 dark:text-slate-400">
                            Revenue peaked on <span className="font-semibold text-slate-700 dark:text-slate-200">Thursday</span> and softened over the weekend.
                        </p>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Pipeline Health</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="h-[120px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.pipelineSummary.stageDistribution} barSize={32}>
                                    <XAxis dataKey="stage" hide />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }} />
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
                            <InsightTile label="Drop Off" value={data.pipelineSummary.dropOff} highlight="red" />
                        </div>
                    </div>
                </div>

                {/* SECONDARY ROW: INVOICES (6) + RISKS (6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Invoice Health</h3>
                        <LinkText href="/md/invoices">View All</LinkText>
                    </div>
                    <div className="p-6 flex items-center gap-10">
                        <div className="h-44 w-44 relative flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.financeSnapshot.invoiceHealth} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {data.financeSnapshot.invoiceHealth.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                    {data.financeSnapshot.counts.paid + data.financeSnapshot.counts.outstanding + data.financeSnapshot.counts.overdue}
                                </span>
                                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide mt-1">Total</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <StatRow label="Paid" value={data.financeSnapshot.counts.paid} color="text-emerald-600" />
                            <StatRow label="Outstanding" value={data.financeSnapshot.counts.outstanding} color="text-amber-600" />
                            <StatRow label="Overdue" value={data.financeSnapshot.counts.overdue} color="text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Critical Risks</h3>
                        <LinkText href="/md/monitoring">Monitoring Center</LinkText>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {data.riskFeed.slice(0, 4).map((risk) => (
                            <div key={risk.id} className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${getSeverityDot(risk.severity)}`}></div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{risk.title}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{risk.metric}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{risk.delta}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[12px] text-slate-400 font-medium">{risk.time}</span>
                                    <ChevronRight size={16} className="text-slate-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TERTIARY ROW: POINTS (6) + AI (6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                        <div>
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Points Distribution</h3>
                            <p className="text-[13px] text-slate-500">Team contribution by volume</p>
                        </div>
                        <LinkText href="/md/points">Details</LinkText>
                    </div>
                    <div className="p-6">
                        <div className="h-[160px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.pointsSnapshot.distribution} barSize={40}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '11px' }} />
                                    <Bar dataKey="value" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.6} activeBar={{ fill: '#6366f1', opacity: 1 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Simple Table */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {data.pointsSnapshot.distribution.slice(0, 4).map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-[13px] border-b border-dotted border-slate-200 pb-1">
                                    <span className="font-medium text-slate-600">{p.name}</span>
                                    <span className="font-bold text-slate-900">{p.value} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-gradient-to-br from-indigo-50/30 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-indigo-600" size={20} />
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Executive Briefing</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">AI Advisory</span>
                    </div>
                    <div className="divide-y divide-indigo-50 dark:divide-slate-700/50">
                        {data.aiBrief.map((insight) => (
                            <div key={insight.id} onClick={() => router.push(insight.link)} className="group flex items-start gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors">
                                <div className="mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-600"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{insight.metric}</span>
                                        <h4 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{insight.title}</h4>
                                    </div>
                                    <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{insight.summary}</p>
                                </div>
                                <ArrowUpRight size={16} className="text-indigo-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-3 border-t border-indigo-50 dark:border-slate-700/50 bg-indigo-50/30 dark:bg-slate-800/50">
                        <button onClick={() => router.push('/md/ai-assistant')} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Ask Strategy Assistant <ChevronRight size={14} />
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
