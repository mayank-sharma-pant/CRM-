'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useRouter } from 'next/navigation';
import {
    Activity,
    Users,
    TrendingUp,
    Receipt,
    Globe,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    AlertTriangle,
    DollarSign,
    Award,
    RefreshCw,
    Calendar,
    Bell,
    ChevronRight,
    UserSearch,
    TrendingDown
} from 'lucide-react';
import MomentumChart from '../../../components/charts/MomentumChart';
import PipelineChart from '../../../components/charts/PipelineChart';
import { RetentionChart, LiquidityChart } from '../../../components/charts/SharedCharts';

import { useNotification } from '../../../contexts/NotificationContext';
import KPICard from '../../../components/shared/KPICard';

export default function MDDashboard() {
    const router = useRouter();
    const { showToast } = useNotification();
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
                salesMomentum: baseData.salesMomentum || { trend: [], outcomes: [] },
                clientSnapshot: baseData.clientSnapshot || { growth: [], status: { active: 0, risk: 0 } },
                trendWatchlist: baseData.trendWatchlist || [],
                aiBrief: baseData.aiBrief || []
            };

            setData(fullData);
        } catch (err) {
            console.error('Failed to fetch MD dashboard', err);
            setError('Unable to load MD dashboard. Please retry.');
            showToast("Failed to sync dashboard", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) return <DashboardSkeleton />;
    if (error) {
        return (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                <AlertTriangle size={24} className="text-error" />
                <p className="text-error font-bold uppercase tracking-widest text-[12px]">{error}</p>
                <button
                    onClick={fetchDashboard}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight"
                >
                    Retry
                </button>
            </div>
        );
    }
    if (!data) return null;

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
                        <div className="flex-1 min-w-0 h-[220px]">
                            <MomentumChart data={data.salesMomentum.trend} />
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
                            <PipelineChart data={data.pipelineSummary.stageDistribution} />
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
                        <div className="flex-1 min-w-0 h-[140px]">
                            <RetentionChart data={data.clientSnapshot.growth} />
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
                    <div className="p-5 flex gap-4">
                        <div className="w-[120px] h-[120px]">
                            <LiquidityChart data={data.financeSnapshot.invoiceHealth} />
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
                        <LinkText href="/md/sales">Analysis</LinkText>
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

import Skeleton, { CardSkeleton } from '../../../components/shared/Skeleton';

function RevenueSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-60 opacity-60" />
                </div>
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                   <Skeleton className="h-5 w-48" />
                   <div className="flex gap-2">
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-7 w-16" />
                   </div>
                </div>
                <Skeleton className="h-[380px] w-full rounded-lg shadow-sm" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 space-y-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-[260px] w-full rounded-lg" />
                </div>
                <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 space-y-4">
                    <Skeleton className="h-5 w-32" />
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 bg-page min-h-screen">
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-32 opacity-60" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 bg-surface border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-[300px] w-full rounded-lg" />
                </div>
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-[200px] w-full rounded-lg" />
                    </div>
                </div>
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
