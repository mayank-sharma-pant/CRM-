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
    Filter,
    ArrowUpRight,
    ArrowRight,
    BarChart3,
    Search,
    ChevronRight
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export default function MDSalesPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trendMode, setTrendMode] = useState('revenue');
    const [comparisonMetric, setComparisonMetric] = useState('revenue');

    useEffect(() => {
        const fetchSales = async () => {
            try {
                setLoading(true);
                const res = await api.get('/md/sales');
                const apiData = res.data;

                const enrichedData = {
                    kpis: [
                        { id: 1, label: 'Aggregate Deals', value: apiData.summary?.total_deals || 0, sub: 'Lifetime Volume' },
                        { id: 2, label: 'Conversion Won', value: apiData.summary?.won || 0, sub: 'Yield' },
                        { id: 3, label: 'Success Rate', value: `${apiData.summary?.win_rate || 0}%`, sub: 'Efficiency Index', color: 'text-success' },
                        { id: 4, label: 'Active Pipeline', value: apiData.summary?.active || 0, sub: 'In-Flight' }
                    ],
                    salesTrend: apiData.salesTrend || [],
                    trendObservation: apiData.trendObservation || "Stability in deal flow across most teams.",
                    funnel: apiData.funnel || {
                        stages: [
                            { name: 'Total Deals', value: apiData.summary?.total_deals || 0, color: 'var(--accent)' },
                            { name: 'Active', value: apiData.summary?.active || 0, color: 'var(--secondary)' },
                            { name: 'Won', value: apiData.summary?.won || 0, color: 'var(--primary)' }
                        ],
                        signals: []
                    },
                    teamComparison: apiData.team_performance?.map(t => ({
                        team: t.team,
                        sales: t.leads,
                        revenue: t.won * 10000,
                        conversion: t.win_rate
                    })) || [],
                    salesSummary: [
                        { id: 1, period: 'Current Month', sales: apiData.summary?.total_deals || 0, revenue: `$${(apiData.summary?.won || 0) * 10}k`, conversion: `${apiData.summary?.win_rate || 0}%`, notes: 'Steady growth' }
                    ],
                    aiInsights: apiData.aiInsights || []
                };

                setData(enrichedData);
            } catch (err) {
                console.error("Failed to fetch MD sales", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    if (loading) return <SalesSkeleton />;
    if (!data) return <div className="p-12 text-center text-muted">No sales data available.</div>;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Sales Operations Cockpit */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Sales Attribution Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Aggregate Transactional Flow & yield Index</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Analysis Window</span>
                    </button>
                    <div className="h-6 w-px bg-border mx-1"></div>
                    <button className="p-1.5 text-muted hover:text-primary transition-colors">
                        <Download size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: KPI STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {data.kpis.map((kpi) => (
                    <KPIMini key={kpi.id} label={kpi.label} value={kpi.value} sub={kpi.sub} color={kpi.color || 'text-primary'} />
                ))}
            </div>

            {/* SECTION 2: TREND & FUNNEL (8 + 4) */}
            <div className="grid grid-cols-12 gap-5">
                {/* Sales Trend */}
                <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm p-5 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Transactional Velocity</h3>
                        <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                            {['revenue', 'count'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setTrendMode(m)}
                                    className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${trendMode === m ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.salesTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={v => trendMode === 'revenue' ? `$${v / 1000}k` : v} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                                    cursor={{ stroke: 'var(--accent)', strokeWidth: 2 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={trendMode}
                                    stroke="var(--accent)"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'white', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-surface-elevated/30 rounded-md border border-border/50">
                        <BarChart3 size={16} className="text-muted mt-0.5" strokeWidth={2.5} />
                        <p className="text-[13px] text-secondary font-bold uppercase tracking-tight opacity-70 italic">{data.trendObservation}</p>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-6">Yield Conversion</h3>
                    <div className="flex-1 space-y-6">
                        {data.funnel.stages.map((stage, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-[11px] font-black text-muted uppercase tracking-widest">{stage.name}</span>
                                    <span className="text-[18px] font-black text-primary tabular-nums tracking-tighter">{stage.value.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(stage.value / data.funnel.stages[0].value) * 100}%`, backgroundColor: stage.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-border">
                        {data.funnel.signals.map((signal, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-muted uppercase tracking-widest">{signal.label} Efficiency</span>
                                <div className="text-right">
                                    <div className="text-[18px] font-black text-accent tabular-nums tracking-tighter">{signal.value}</div>
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-tight">{signal.metric}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECTION 3: TEAM PERFORMANCE & SUMMARY */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-7 bg-surface rounded-md border border-border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Team Contribution Matrix</h3>
                        <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                            {['revenue', 'sales', 'conversion'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setComparisonMetric(m)}
                                    className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${comparisonMetric === m ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[200px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.teamComparison} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="team" stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'var(--surface-elevated)', opacity: 0.5 }} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar dataKey={comparisonMetric} radius={[2, 2, 0, 0]}>
                                    {data.teamComparison.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent)' : 'var(--secondary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-border/50">
                                {data.teamComparison.map((team, i) => (
                                    <tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                                        <td className="py-2.5 text-[13px] font-bold text-primary">{team.team}</td>
                                        <td className="py-2.5 text-right font-mono text-[11px] font-bold text-muted uppercase tracking-tight">C: {team.sales}</td>
                                        <td className="py-2.5 text-right font-mono text-[12px] font-black text-primary">${team.revenue.toLocaleString()}</td>
                                        <td className="py-2.5 text-right font-mono text-[12px] font-bold text-accent">{team.conversion}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function KPIMini({ label, value, sub, color = "text-primary" }) {
    return (
        <div className="bg-surface rounded-md border border-border p-4 shadow-sm hover:bg-surface-elevated transition-colors group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{label}</span>
            <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-[24px] font-black tracking-tighter tabular-nums leading-none ${color}`}>{value}</span>
                <span className="text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">{sub}</span>
            </div>
        </div>
    );
}

function SalesSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="h-10 w-48 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-md"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[300px] bg-surface rounded-md"></div>
                <div className="col-span-4 h-[300px] bg-surface rounded-md"></div>
            </div>
        </div>
    );
}
