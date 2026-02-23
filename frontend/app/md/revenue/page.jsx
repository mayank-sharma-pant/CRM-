'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    ArrowRight,
    X,
    AlertTriangle,
    Activity
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
        const fetchRevenue = async () => {
            try {
                setLoading(true);
                const res = await api.get('/md/revenue');
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch MD revenue", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
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
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Executive Analytics Cockpit */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Revenue Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Fiscal Trends & Risk Signals</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {/* Compare Toggle */}
                    <button
                        onClick={() => setCompareEnabled(!compareEnabled)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all text-[12px] font-bold uppercase tracking-tight ${compareEnabled
                                ? 'bg-accent/10 border-accent/30 text-accent'
                                : 'bg-surface border-border text-secondary hover:bg-surface-elevated'
                            }`}
                    >
                        <div className={`w-7 h-4 rounded-full relative transition-colors ${compareEnabled ? 'bg-accent' : 'bg-border'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${compareEnabled ? 'left-3.5' : 'left-0.5'}`}></div>
                        </div>
                        <span>Reference Comparison</span>
                    </button>
                    <div className="h-6 w-px bg-border mx-1"></div>
                    {/* Date Range Selector */}
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>L30D</span>
                    </button>
                </div>
            </div>

            {/* Section A: KPI Strip (High Density) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpisToShow.map((kpi) => (
                    <div key={kpi.id} className="bg-surface rounded-md border border-border p-4 h-[100px] flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm group">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <span className="text-[28px] font-black tracking-tighter text-primary tabular-nums leading-none">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* Section B: Primary Trend Panel */}
            <div className="bg-surface rounded-md border border-border shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-accent" strokeWidth={2.5} />
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Revenue Trajectory</h3>
                    </div>
                    <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                        {['Daily', 'Weekly', 'Monthly'].map((view) => (
                            <button
                                key={view}
                                onClick={() => setTrendView(view)}
                                className={`px-4 py-1 text-[11px] font-bold uppercase tracking-tight rounded transition-all ${trendView === view
                                        ? 'bg-surface shadow-sm text-primary'
                                        : 'text-muted hover:text-secondary'
                                    }`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="0" vertical={false} stroke="var(--border)" opacity={0.4} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--muted)"
                                fontSize={10}
                                fontPadding={10}
                                fontWeight={700}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="var(--muted)"
                                fontSize={10}
                                fontWeight={700}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={v => `$${v / 1000}k`}
                                dx={-4}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: 'var(--primary)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: 'var(--accent)' }}
                                cursor={{ stroke: 'var(--accent)', strokeWidth: 1.5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="var(--accent)"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
                            />
                            {compareEnabled && (
                                <Line
                                    type="monotone"
                                    dataKey="avg"
                                    stroke="var(--secondary)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    opacity={0.5}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Footer Insight */}
                <div className="mt-4 flex items-center gap-2.5 p-3 bg-surface-elevated/30 rounded-md border border-border/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                    <p className="text-[12px] text-secondary font-bold uppercase tracking-tight">{data.trendInsight}</p>
                </div>
            </div>

            {/* Section C: Variance & Breakdown (7 + 5 split) */}
            <div className="grid grid-cols-12 gap-5">
                {/* Variance Summary (col-span-12 lg:col-span-7) */}
                <div className="col-span-12 lg:col-span-7 bg-surface rounded-md border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <Activity size={16} className="text-secondary opacity-70" strokeWidth={2.5} />
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight ml-2">Variance Matrix</h3>
                    </div>
                    <div className="flex-1">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-surface-elevated/5">
                                    <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Period</th>
                                    <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest text-right">Revenue</th>
                                    <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest text-right">Differential</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {varianceRows.map((row, idx) => (
                                    <tr key={row.id} className={`hover:bg-surface-elevated/30 transition-colors ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}>
                                        <td className="py-2.5 px-5 text-[12px] font-bold text-primary">{row.period}</td>
                                        <td className="py-2.5 px-5 text-[12px] text-right font-black text-secondary tabular-nums font-mono">{row.revenue}</td>
                                        <td className="py-2.5 px-5 text-right">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-black border tabular-nums ${row.delta.startsWith('+') ? 'bg-success/10 text-success border-success/20' :
                                                    row.delta === '0%' ? 'bg-surface-elevated text-muted border-border' :
                                                        'bg-error/10 text-error border-error/20'
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

                {/* Revenue Breakdown (col-span-12 lg:col-span-5) */}
                <div className="col-span-12 lg:col-span-5 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-5">Component Breakdown</h3>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdownData} layout="vertical" barSize={16}>
                                <CartesianGrid strokeDasharray="0" horizontal={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="var(--muted)"
                                    fontSize={10}
                                    fontWeight={700}
                                    tickLine={false}
                                    axisLine={false}
                                    width={80}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--surface-elevated)', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: '700' }}
                                />
                                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                                    {breakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill || 'var(--accent)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Section D: Revenue Risk Signals */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-warning" strokeWidth={2.5} />
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Revenue Risk Matrix</h3>
                    </div>
                    <button onClick={() => router.push('/md/monitoring')} className="text-[11px] font-black text-accent hover:text-accent-hover uppercase tracking-tight transition-all">
                        Deep Scan
                    </button>
                </div>
                <div className="divide-y divide-border/50">
                    {risksToShow.map((risk) => (
                        <div
                            key={risk.id}
                            onClick={() => setSelectedRisk(risk)}
                            className="group flex items-center justify-between px-5 py-3 hover:bg-surface-elevated/30 cursor-pointer transition-all border-l-2 border-transparent hover:border-accent"
                        >
                            <div className="flex items-center gap-3 w-1/4">
                                <div className={`w-1.5 h-1.5 rounded-full ${risk.severity === 'High' ? 'bg-error animate-pulse' : risk.severity === 'Medium' ? 'bg-warning' : 'bg-info'}`}></div>
                                <div>
                                    <div className="text-[13px] font-bold text-primary group-hover:text-accent transition-colors leading-tight">{risk.signal}</div>
                                    <div className="text-[9px] text-muted font-black mt-0.5 uppercase tracking-widest">{risk.severity} SEVERITY</div>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-8">
                                <div>
                                    <div className="text-[9px] text-muted uppercase tracking-widest font-black">Impact</div>
                                    <div className="text-[12px] font-bold text-secondary mt-0.5">{risk.metric}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-muted uppercase tracking-widest font-black">Velocity</div>
                                    <div className={`text-[12px] font-black tabular-nums mt-0.5 ${risk.delta.startsWith('-') ? 'text-error' : 'text-success'}`}>{risk.delta}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-muted uppercase tracking-widest font-black">Detection</div>
                                    <div className="text-[12px] font-bold text-muted mt-0.5">{risk.detected}</div>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-muted group-hover:text-accent transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Risk Drawer (Slide-in Right) */}
            {selectedRisk && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRisk(null)}></div>
                    <div className="relative w-full max-w-sm bg-surface h-full shadow-2xl border-l border-border p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-[16px] font-bold text-primary uppercase tracking-tight">Signal Analysis</h2>
                            <button onClick={() => setSelectedRisk(null)} className="p-1 rounded-md hover:bg-surface-elevated text-muted transition-colors">
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border ${selectedRisk.severity === 'High' ? 'bg-error/10 text-error border-error/20' :
                                        selectedRisk.severity === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                            'bg-info/10 text-info border-info/20'
                                    }`}>
                                    {selectedRisk.severity} Priority
                                </span>
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-primary leading-tight mb-2">{selectedRisk.signal}</h3>
                                <p className="text-[12px] text-secondary leading-relaxed opacity-80 font-medium">Detailed algorithmic detection of significant revenue variance within the active fiscal period.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                                <div>
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-black">Fiscal Impact</div>
                                    <div className="text-[14px] font-black text-primary mt-1 tabular-nums">{selectedRisk.metric}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-black">Trend Velocity</div>
                                    <div className={`text-[14px] font-black mt-1 tabular-nums ${selectedRisk.delta.startsWith('-') ? 'text-error' : 'text-success'}`}>{selectedRisk.delta}</div>
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
    if (!change) return null;
    const isUp = trend === 'up';
    const isDown = trend === 'down';

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-black tabular-nums border ${isUp ? 'bg-success/10 text-success border-success/20' :
                isDown ? 'bg-error/10 text-error border-error/20' :
                    'bg-surface-elevated text-muted border-border'
            }`}>
            {isUp ? <TrendingUp size={10} strokeWidth={3} /> : isDown ? <TrendingDown size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={3} />}
            {change}
        </div>
    );
}

function RevenueSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <div className="h-6 w-32 bg-surface border border-border rounded"></div>
                    <div className="h-4 w-48 bg-surface border border-border rounded"></div>
                </div>
                <div className="h-8 w-48 bg-surface border border-border rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-[100px] bg-surface rounded-md border border-border"></div>)}
            </div>
            <div className="h-[380px] bg-surface rounded-md border border-border shadow-sm"></div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-7 h-[260px] bg-surface rounded-md border border-border shadow-sm"></div>
                <div className="col-span-5 h-[260px] bg-surface rounded-md border border-border shadow-sm"></div>
            </div>
            <div className="h-[220px] bg-surface rounded-md border border-border shadow-sm"></div>
        </div>
    );
}
