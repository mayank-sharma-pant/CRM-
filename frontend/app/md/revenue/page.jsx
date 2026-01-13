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
    AlertTriangle,
    ArrowRight,
    ChevronRight,
    MoreHorizontal,
    Filter,
    ArrowUpRight
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, ReferenceLine
} from 'recharts';

export default function MDRevenuePage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API fetch
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
        <div className="p-12 text-center">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">No revenue data available</h2>
            <p className="text-slate-500 mt-2">Please check the mock data configuration.</p>
        </div>
    );

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* HERDER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Revenue</h1>
                    <p className="text-[16px] text-slate-500 dark:text-slate-400 font-medium mt-1">Company revenue trends and performance signals.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-[14px] font-medium text-slate-600 dark:text-slate-300 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors">
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                        <span>Compare to last period</span>
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors">
                        <Calendar size={18} className="text-slate-400" />
                        <span>Last 30 Days</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 rounded-lg" disabled title="Export not available">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.kpis.map((kpi) => (
                    <div key={kpi.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-[110px] relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</span>
                            {/* Tiny sparkline placeholder or subtle visual */}
                            <div className="flex gap-0.5 items-end opacity-20 h-6">
                                <div className="w-1 bg-current h-2 rounded-t-sm"></div>
                                <div className="w-1 bg-current h-3 rounded-t-sm"></div>
                                <div className="w-1 bg-current h-4 rounded-t-sm"></div>
                                <div className="w-1 bg-current h-2 rounded-t-sm"></div>
                                <div className="w-1 bg-current h-5 rounded-t-sm"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTION 2: REVENUE TREND */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-[12px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Avg/Day: $12.4k</span>
                            <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Peak: $23.1k</span>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button className="px-3 py-1 text-[13px] font-medium rounded-md bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white">Daily</button>
                        <button className="px-3 py-1 text-[13px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Weekly</button>
                        <button className="px-3 py-1 text-[13px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Monthly</button>
                    </div>
                </div>

                <div className="h-[340px] w-full">
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
                            {/* Optional styling: Add average line visually? No, keep clean. */}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex items-start gap-3 p-4 bg-indigo-50/50 dark:bg-slate-700/30 rounded-lg border border-indigo-100 dark:border-slate-700">
                    <div className="mt-1">
                        <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Key Observation</span>
                        <p className="text-[14px] text-slate-700 dark:text-slate-300 mt-1 font-medium">{data.trendInsight}</p>
                    </div>
                </div>
            </div>

            {/* SECTION 3: BREAKDOWN & VARIANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Breakdown */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-6">Revenue Breakdown</h3>

                    {/* Multi-axis or Stacked Bar */}
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.breakdown.byPeriod} layout="vertical" barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} width={80} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px', color: '#fff' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {data.breakdown.byPeriod.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Variance */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-6">Variance & Momentum</h3>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">Best Period</span>
                            <div className="mt-1 text-[16px] font-bold text-emerald-900 dark:text-emerald-300">{data.variance.bestPeriod.label}</div>
                            <div className="text-[12px] text-emerald-600 dark:text-emerald-400">{data.variance.bestPeriod.growth}</div>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                            <span className="text-[11px] text-red-700 dark:text-red-400 font-bold uppercase tracking-wide">Worst Period</span>
                            <div className="mt-1 text-[16px] font-bold text-red-900 dark:text-red-300">{data.variance.worstPeriod.label}</div>
                            <div className="text-[12px] text-red-600 dark:text-red-400">{data.variance.worstPeriod.growth}</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">Stability</span>
                            <div className="mt-1 text-[16px] font-bold text-slate-800 dark:text-slate-200">{data.variance.stability.status}</div>
                            <div className="text-[12px] text-slate-500">{data.variance.stability.score}/10 Score</div>
                        </div>
                    </div>

                    {/* Momentum Sparkline */}
                    <div className="mb-6">
                        <div className="text-[12px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Momentum (Last 10 Weeks)</div>
                        <div className="h-[60px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.variance.momentum.map((v, i) => ({ i, v }))}>
                                    <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <table className="w-full text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700">
                                <th className="pb-2 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Comparison</th>
                                <th className="pb-2 font-semibold text-slate-500 text-right uppercase tracking-wide text-[11px]">Revenue</th>
                                <th className="pb-2 font-semibold text-slate-500 text-right uppercase tracking-wide text-[11px]">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {data.variance.comparison.map((row, i) => (
                                <tr key={i}>
                                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{row.period}</td>
                                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">{row.revenue}</td>
                                    <td className="py-2.5 text-right">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${row.change.startsWith('+') ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {row.change}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 4: RISKS */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Revenue Risk Signals</h3>
                    <button onClick={() => router.push('/md/monitoring')} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        Open Monitoring <ArrowRight size={14} />
                    </button>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {data.risks.map((risk) => (
                        <div key={risk.id} className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4 w-1/3">
                                <div className={`w-2 h-2 rounded-full ${risk.severity === 'High' ? 'bg-red-500 shadow-sm shadow-red-200' :
                                    risk.severity === 'Medium' ? 'bg-amber-500 shadow-sm shadow-amber-200' : 'bg-blue-500'
                                    }`}></div>
                                <div>
                                    <div className="text-[14px] font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{risk.signal}</div>
                                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{risk.severity} Severity</div>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Impact</div>
                                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{risk.metric}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Trend</div>
                                    <div className={`text-[13px] font-bold ${risk.delta.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{risk.delta}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Detected</div>
                                    <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{risk.detected}</div>
                                </div>
                            </div>

                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 5: SUMMARY TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Revenue Summary</h3>
                    <div className="flex gap-2">
                        <button className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="pb-3 pl-2 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Period</th>
                                <th className="pb-3 font-semibold text-slate-500 text-right uppercase tracking-wide text-[11px]">Revenue</th>
                                <th className="pb-3 font-semibold text-slate-500 text-right uppercase tracking-wide text-[11px]">Change %</th>
                                <th className="pb-3 pl-8 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {data.summaryTable.map((row) => (
                                <tr key={row.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 pl-2 font-medium text-slate-900 dark:text-white">{row.period}</td>
                                    <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">{row.revenue}</td>
                                    <td className="py-3 text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${row.delta.startsWith('+') ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            row.delta === '0%' ? 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-700' :
                                                'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {row.delta}
                                        </span>
                                    </td>
                                    <td className="py-3 pl-8 text-slate-500 text-[13px] italic">{row.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
        // Context dependent: if "Outstanding" goes down, it's good, but usually 'down' is red for revenue.
        // Assuming simple mapping here.
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

function RevenueSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>

            <div className="grid grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>

            <div className="h-[340px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>

            <div className="grid grid-cols-12 gap-5 h-[300px]">
                <div className="col-span-6 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="col-span-6 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
    );
}
