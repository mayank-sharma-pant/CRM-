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
    Filter,
    ArrowUpRight,
    ArrowRight,
    BrainCircuit,
    BarChart3,
    Search
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';

export default function MDSalesPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trendMode, setTrendMode] = useState('revenue'); // 'revenue' or 'count'
    const [comparisonMetric, setComparisonMetric] = useState('revenue'); // 'revenue', 'sales', 'conversion'

    useEffect(() => {
        setTimeout(() => {
            const salesData = MOCK_DATA['/md/sales'];
            if (salesData) setData(salesData);
            setLoading(false);
        }, 600);
    }, []);

    if (loading) return <SalesSkeleton />;

    if (!data) return <div className="p-12 text-center text-slate-500">No sales data available.</div>;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Sales</h1>
                    <p className="text-[16px] text-slate-500 dark:text-slate-400 font-medium mt-1">Company sales performance and conversion outcomes.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors">
                        <Calendar size={18} className="text-slate-400" />
                        <span>Last 30 Days</span>
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white">Weekly</button>
                        <button className="px-3 py-1.5 text-[13px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Monthly</button>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 rounded-lg" disabled title="Export not available">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: SALES KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.kpis.map((kpi) => (
                    <div key={kpi.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-[110px] flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <div className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</div>
                    </div>
                ))}
            </div>

            {/* SECTION 2 & 3: TREND & FUNNEL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Sales Trend (col-span-8) */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Sales Trend</h3>
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button
                                onClick={() => setTrendMode('revenue')}
                                className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all ${trendMode === 'revenue' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Revenue
                            </button>
                            <button
                                onClick={() => setTrendMode('count')}
                                className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all ${trendMode === 'count' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Count
                            </button>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={12} />
                                <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dx={-4} tickFormatter={v => trendMode === 'revenue' ? `$${v / 1000}k` : v} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={trendMode}
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                        <BarChart3 size={18} className="text-slate-500 mt-0.5" />
                        <p className="text-[14px] text-slate-700 dark:text-slate-300 font-medium">{data.trendObservation}</p>
                    </div>
                </div>

                {/* Conversion Outcomes (col-span-4) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-6">Conversion Outcomes</h3>

                    <div className="flex-1 min-h-[200px] mb-6 relative">
                        {/* Custom Funnel Representation */}
                        <div className="space-y-3">
                            {data.funnel.stages.map((stage, i) => (
                                <div key={i} className="relative">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{stage.name}</span>
                                        <span className="text-[13px] font-bold text-slate-900 dark:text-white">{stage.value.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${(stage.value / data.funnel.stages[0].value) * 100}%`, backgroundColor: stage.color }}
                                        ></div>
                                    </div>
                                    {/* Arrow for conversion flow except last */}
                                    {i < data.funnel.stages.length - 1 && (
                                        <div className="flex justify-center my-1">
                                            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                        {data.funnel.signals.map((signal, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">{signal.label}</span>
                                <div className="text-right">
                                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{signal.value}</div>
                                    <div className={`text-[11px] font-bold ${signal.status === 'good' ? 'text-emerald-600' :
                                        signal.status === 'bad' ? 'text-red-600' : 'text-slate-500'
                                        }`}>{signal.metric}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECTION 4: TEAM COMPARISON */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Team Comparison</h3>
                        <p className="text-[13px] text-slate-500 mt-1">Sales performance contribution by team (aggregated).</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        {['revenue', 'sales', 'conversion'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setComparisonMetric(m)}
                                className={`px-3 py-1 text-[13px] font-medium rounded-md capitalize transition-all ${comparisonMetric === m ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[250px] w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.teamComparison} barSize={48}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis dataKey="team" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dx={-4} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px', color: '#fff' }}
                            />
                            <Bar dataKey={comparisonMetric} radius={[4, 4, 0, 0]}>
                                {data.teamComparison.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="pb-3 pl-2 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Team</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Sales Count</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Revenue</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Conversion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {data.teamComparison.map((team, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 pl-2 font-medium text-slate-900 dark:text-white">{team.team}</td>
                                    <td className="py-3 text-right text-slate-700 dark:text-slate-300">{team.sales}</td>
                                    <td className="py-3 text-right font-mono text-slate-700 dark:text-slate-300">${team.revenue.toLocaleString()}</td>
                                    <td className="py-3 text-right font-bold text-slate-700 dark:text-slate-300">{team.conversion}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 5: SALES SUMMARY TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Sales Summary</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" disabled placeholder="Search..." className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[13px] text-slate-500 cursor-not-allowed" />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="pb-3 pl-2 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Period</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Sales Count</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Revenue</th>
                                <th className="pb-3 text-right font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Conversion %</th>
                                <th className="pb-3 pl-8 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {data.salesSummary.map((row) => (
                                <tr key={row.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-default">
                                    <td className="py-3 pl-2 font-medium text-slate-900 dark:text-white">{row.period}</td>
                                    <td className="py-3 text-right text-slate-700 dark:text-slate-300">{row.sales}</td>
                                    <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">{row.revenue}</td>
                                    <td className="py-3 text-right font-bold text-slate-700 dark:text-slate-300">{row.conversion}</td>
                                    <td className="py-3 pl-8 text-slate-500 text-[13px] italic">{row.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 6: AI INSIGHTS */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600" size={20} />
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">AI Sales Insights</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold tracking-wide rounded">Read Only Advisory</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {data.aiInsights.map((insight, i) => (
                        <div key={i} className="bg-white/60 dark:bg-slate-700/40 p-4 rounded-xl border border-indigo-50 dark:border-slate-600 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 transition-colors flex flex-col justify-between h-full">
                            <div>
                                <span className="inline-block px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wide rounded mb-2">{insight.tag}</span>
                                <p className="text-[14px] font-semibold text-slate-800 dark:text-white mb-4 leading-snug">{insight.title}</p>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="flex flex-wrap gap-1.5">
                                    {insight.evidence.map((ev, j) => (
                                        <span key={j} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded border border-slate-200 dark:border-slate-600">{ev}</span>
                                    ))}
                                </div>
                                <button onClick={() => router.push(insight.link)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${colors}`}>
            <Icon size={12} strokeWidth={2.5} />
            {change}
        </div>
    );
}

function SalesSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-6 animate-pulse">
            <div className="h-10 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5 h-[320px]">
                <div className="col-span-8 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="col-span-4 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
            <div className="h-[250px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
    )
}
