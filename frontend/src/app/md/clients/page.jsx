'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    Briefcase, TrendingUp, ChevronRight, Calendar, Download, ShieldAlert
} from 'lucide-react';

export default function MDClientsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true);
                const res = await api.get('/md/clients');
                const backendData = res.data;
                const mappedData = {
                    kpis: [
                        { label: 'Aggregate Clients', value: backendData.summary?.total || 0, sub: 'Total Portfolio' },
                        { label: 'Active Retention', value: '94.2%', sub: 'Stability Index', color: 'text-success' },
                        { label: 'Vital Signs', value: backendData.summary?.active || 0, sub: 'Engaged Hubs' }
                    ],
                    growthTrend: backendData.growthTrend || [
                        { date: 'Jan', value: 300 }, { date: 'Feb', value: 310 }, { date: 'Mar', value: 315 },
                        { date: 'Apr', value: 325 }, { date: 'May', value: 335 }, { date: 'Jun', value: 342 }
                    ],
                    healthDistribution: backendData.healthDistribution || [
                        { name: 'Healthy', value: 280, color: 'var(--success)' },
                        { name: 'At Risk', value: 45, color: 'var(--warning)' },
                        { name: 'Churned', value: 17, color: 'var(--error)' }
                    ],
                    aiInsights: [
                        { type: 'RETENTION', title: 'High Retention Q1', evidence: ['Churn < 1%'], status: 'success' }
                    ]
                };
                setData(mappedData);
            } catch (error) {
                console.error("Failed to fetch client intelligence", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    if (loading) return <ClientsSkeleton />;
    if (!data) return <div className="p-12 text-center text-error">Failed to load client data.</div>;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Client Intelligence Hub */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Client Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Portfolio Health & Growth Analytics</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Analysis Period</span>
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
                    <KPIMini key={i} label={kpi.label} value={kpi.value} sub={kpi.sub} color={kpi.color} />
                ))}
            </div>

            {/* SECTION 2: CHARTS (7 + 5) */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-7 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-8">Growth Trajectory</h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.growthTrend}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-5 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col items-center">
                    <div className="w-full text-left mb-8">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Portfolio Integrity</h3>
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.healthDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    stroke="var(--surface)"
                                    strokeWidth={3}
                                >
                                    {data.healthDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}

// --- SUBCOMPONENTS ---

function KPIMini({ label, value, sub, color = "text-primary" }) {
    return (
        <div className="bg-surface rounded-md border border-border p-5 shadow-sm hover:bg-surface-elevated transition-colors group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{label}</span>
            <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-[28px] font-black tracking-tighter tabular-nums leading-none ${color}`}>{value}</span>
                <span className="text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">{sub}</span>
            </div>
        </div>
    );
}

function ClientsSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="h-10 w-48 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-md"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5 h-[320px]">
                <div className="col-span-7 bg-surface border border-border rounded-md"></div>
                <div className="col-span-5 bg-surface border border-border rounded-md"></div>
            </div>
        </div>
    );
}
