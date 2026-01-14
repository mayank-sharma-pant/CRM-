'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    ArrowRight,
    X
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export default function MDRevenuePage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [compareEnabled, setCompareEnabled] = useState(false);
    const [trendView, setTrendView] = useState('Daily'); // Daily | Weekly | Monthly
    const [selectedRisk, setSelectedRisk] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            const revenueData = MOCK_DATA['/md/revenue'];
            if (revenueData) {
                setData(revenueData);
            }
            setLoading(false);
        }, 500);
    }, []);

    if (loading) return <RevenueSkeleton />;

    if (!data) return (
        <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">No revenue data in selected period.</p>
        </div>
    );

    // Filter KPIs to 3: Total Revenue, Growth, Collected/Outstanding
    const kpisToShow = data.kpis.filter(k => ['total', 'growth', 'outstanding'].includes(k.code)).slice(0, 3);

    // Limit risks to top 5
    const risksToShow = data.risks.slice(0, 5);

    // Breakdown: Top 5 + Others
    const breakdownData = data.breakdown.byPeriod.slice(0, 5);
    const otherValue = data.breakdown.byPeriod.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (otherValue > 0) {
        breakdownData.push({ name: 'Others', value: otherValue, fill: '#94a3b8' });
    }

    // Variance Table (max 8 rows)
    const varianceRows = data.summaryTable.slice(0, 8);

    return (
        <div className="mx-auto max-w-[1360px] space-y-5 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* ============================================================ */}
            {/* HEADER */}
            {/* ============================================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Revenue</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Revenue trends, variance, and risk signals.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Compare Toggle */}
                    <button
                        onClick={() => setCompareEnabled(!compareEnabled)}
                        className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${compareEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${compareEnabled ? 'left-5' : 'left-1'}`}></div>
                        </div>
                        <span>vs previous period</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    {/* Date Range Selector */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors">
                        <Calendar size={16} className="text-slate-400" />
                        <span>Last 30 Days</span>
                    </button>
                    {/* Export (Disabled) */}
                    <button
                        className="p-2 text-slate-300 dark:text-slate-600 cursor-not-allowed bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg"
                        disabled
                        title="Export not available"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION A: KPI STRIP (3 Cards) */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {kpisToShow.map((kpi) => (
                    <div key={kpi.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-[110px] flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <span className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* ============================================================ */}
            {/* SECTION B: PRIMARY TREND PANEL (col-span-12) */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        {['Daily', 'Weekly', 'Monthly'].map((view) => (
                            <button
                                key={view}
                                onClick={() => setTrendView(view)}
                                className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${trendView === view ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}k`} dx={-4} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }} />
                            {compareEnabled && <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Footer Observation */}
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">{data.trendInsight}</p>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION C: VARIANCE & BREAKDOWN (7 + 5 split) */}
            {/* ============================================================ */}
            <div className="grid grid-cols-12 gap-5">
                {/* Variance Summary (col-span-7) */}
                <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Variance Summary</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="pb-2 pl-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Period</th>
                                    <th className="pb-2 font-semibold text-slate-500 text-right uppercase tracking-wide text-[10px]">Revenue</th>
                                    <th className="pb-2 pr-2 font-semibold text-slate-500 text-right uppercase tracking-wide text-[10px]">Δ %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {varianceRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-2.5 pl-2 font-medium text-slate-800 dark:text-slate-200">{row.period}</td>
                                        <td className="py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{row.revenue}</td>
                                        <td className="py-2.5 pr-2 text-right">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${row.delta.startsWith('+') ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                row.delta === '0%' ? 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-700' :
                                                    'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {row.delta}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Revenue Breakdown (col-span-5) */}
                <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Revenue Breakdown</h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdownData} layout="vertical" barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={70} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '11px', color: '#fff' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {breakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION D: REVENUE RISK SIGNALS (col-span-12) */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Revenue Risks</h3>
                    <button onClick={() => router.push('/md/monitoring')} className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        Monitoring <ArrowRight size={13} />
                    </button>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {risksToShow.map((risk) => (
                        <div
                            key={risk.id}
                            onClick={() => setSelectedRisk(risk)}
                            className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3 w-1/4">
                                <div className={`w-2 h-2 rounded-full ${risk.severity === 'High' ? 'bg-red-500' : risk.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                <div>
                                    <div className="text-[13px] font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{risk.signal}</div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{risk.severity}</div>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Impact</div>
                                    <div className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{risk.metric}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Trend</div>
                                    <div className={`text-[12px] font-bold ${risk.delta.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{risk.delta}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Detected</div>
                                    <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{risk.detected}</div>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </div>
                    ))}
                </div>
            </div>

            {/* ============================================================ */}
            {/* RISK DRAWER (Slide-in Right) */}
            {/* ============================================================ */}
            {selectedRisk && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRisk(null)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-xl p-6 overflow-y-auto" style={{ animation: 'slideInRight 160ms ease-out forwards' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Risk Details</h2>
                            <button onClick={() => setSelectedRisk(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${selectedRisk.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : selectedRisk.severity === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {selectedRisk.severity}
                                </span>
                            </div>
                            <h3 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">{selectedRisk.signal}</h3>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Metric</div>
                                    <div className="text-[14px] font-medium text-slate-700 dark:text-slate-300 mt-1">{selectedRisk.metric}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Delta</div>
                                    <div className={`text-[14px] font-bold mt-1 ${selectedRisk.delta.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{selectedRisk.delta}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Detected</div>
                                    <div className="text-[14px] font-medium text-slate-700 dark:text-slate-300 mt-1">{selectedRisk.detected}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// --- SUBCOMPONENTS ---

function BadgeChange({ change, trend }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    let Icon = Minus;

    if (trend === 'up') {
        colors = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        Icon = TrendingUp;
    } else if (trend === 'down') {
        colors = 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        Icon = TrendingDown;
    }

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${colors}`}>
            <Icon size={11} strokeWidth={2.5} />
            {change}
        </div>
    );
}

function RevenueSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-5 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-9 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-[110px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
            </div>

            {/* Trend */}
            <div className="h-[380px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>

            {/* Variance + Breakdown */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-7 h-[260px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-5 h-[260px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>

            {/* Risks */}
            <div className="h-[220px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
