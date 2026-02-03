'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, Users, Filter, Calendar, ChevronRight, Download, BrainCircuit, Activity
} from 'lucide-react';

export default function MDLeadsPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                setLoading(true);
                const res = await api.get('/md/leads');
                const apiData = res.data;

                const enrichedData = {
                    kpis: [
                        { label: 'Aggregate Inflow', value: apiData.total || 0, sub: 'Lifetime Volume' },
                        { label: 'Yield Index', value: '2.4%', sub: 'Conversion' },
                        { label: 'Pipeline depth', value: apiData.total || 0, sub: 'Active Signals' }
                    ],
                    funnel: [
                        { name: 'Lead', value: apiData.total || 100 },
                        { name: 'Contacted', value: 45 },
                        { name: 'Converted', value: 12 }
                    ],
                    sourceBreakdown: [
                        { name: 'Direct', value: 65, color: 'var(--accent)' },
                        { name: 'Referral', value: 25, color: 'var(--secondary)' },
                        { name: 'Organic', value: 10, color: 'var(--primary)' }
                    ],
                    aiInsights: [
                        { type: 'VELOCITY', title: 'Lead Inflow Spike', evidence: ['+15% in 24h'], status: 'info' }
                    ]
                };
                setData(enrichedData);
            } catch (err) {
                console.error("Failed to fetch MD leads", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, []);

    if (loading) return <LeadsSkeleton />;
    if (!data) return <div className="p-12 text-center text-muted">No lead data available.</div>;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Lead Operations Cockpit */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Lead Inflow Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Aggregate Pipeline & Conversion Analytics</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Filter Matrix</span>
                    </button>
                    <div className="h-6 w-px bg-border mx-1"></div>
                    <button className="p-1.5 text-muted hover:text-primary transition-colors">
                        <Download size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.kpis.map((kpi, i) => (
                    <KPIMini key={i} label={kpi.label} value={kpi.value} sub={kpi.sub} />
                ))}
            </div>

            {/* SECTION 2: CHARTS (6 + 6) */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-8">Funnel Stage Yield</h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.funnel} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="var(--muted)" fontSize={11} fontWeight="bold" width={80} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'var(--surface-elevated)', opacity: 0.5 }} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={24}>
                                    {data.funnel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : index === 1 ? 'var(--secondary)' : 'var(--primary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-8">Lead Source Distribution</h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} stroke="var(--surface)" strokeWidth={4}>
                                    {data.sourceBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* SECTION 3: AI INTELLIGENCE */}
            <div className="bg-surface rounded-md border border-border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-6">
                    <BrainCircuit className="text-accent" size={16} strokeWidth={2.5} />
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">AI Pipeline Advisory</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.aiInsights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-surface-elevated/30 rounded-md border border-border/50 group hover:border-accent transition-all">
                            <Activity className="text-accent mt-0.5" size={16} strokeWidth={2.5} />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/5 px-2 py-0.5 rounded-[4px] border border-accent/20">{insight.type}</span>
                                </div>
                                <p className="text-[13px] font-bold text-primary mb-2 leading-tight group-hover:text-accent transition-colors">{insight.title}</p>
                                <div className="flex flex-wrap gap-2">
                                    {insight.evidence.map((ev, j) => (
                                        <span key={j} className="text-[10px] font-bold text-muted uppercase tracking-tight px-1.5 py-0.5 bg-surface border border-border rounded-[4px]">{ev}</span>
                                    ))}
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-muted group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function KPIMini({ label, value, sub }) {
    return (
        <div className="bg-surface rounded-md border border-border p-5 shadow-sm hover:bg-surface-elevated transition-colors group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{label}</span>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[28px] font-black tracking-tighter tabular-nums leading-none text-primary">{value}</span>
                <span className="text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">{sub}</span>
            </div>
        </div>
    );
}

function LeadsSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="h-10 w-48 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-md"></div>)}
            </div>
            <div className="grid grid-cols-2 gap-5 h-[320px]">
                <div className="bg-surface border border-border rounded-md"></div>
                <div className="bg-surface border border-border rounded-md"></div>
            </div>
        </div>
    );
}
