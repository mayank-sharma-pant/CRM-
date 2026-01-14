'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    X,
    ArrowRight,
    BrainCircuit,
    Info
} from 'lucide-react';
import {
    LineChart, Line, ResponsiveContainer
} from 'recharts';

// Signal definitions for each alert type (read-only reference)
const SIGNAL_DEFINITIONS = {
    'Liquidity Gap Projected': { metric: 'Projected Cashflow', comparison: 'End of Period vs Safety Threshold', threshold: '$50k buffer' },
    'Major Account Churn Signal': { metric: 'Engagement Score', comparison: 'Current Week vs Previous Week', threshold: '>30% drop' },
    'Conversion Rate Dip': { metric: 'Conversion Rate %', comparison: 'Current vs Q3 Baseline', threshold: '<20%' },
    'Stalled Deals in Negotiation': { metric: 'Days in Stage', comparison: 'Current avg vs Target', threshold: '>14 days' },
    'Abnormal Discounting': { metric: 'Discount %', comparison: 'Current avg vs Historical avg', threshold: '>15%' },
    'Lead Inflow Spike': { metric: 'New Leads/Day', comparison: 'Current vs 30-day avg', threshold: '>+25%' }
};

export default function MDMonitoringPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            const monitoringData = MOCK_DATA['/md/monitoring'];
            if (monitoringData) setData(monitoringData);
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <MonitoringSkeleton />;

    if (!data) return (
        <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">No alerts detected for selected period.</p>
        </div>
    );

    // Limit alerts to top 7
    const topAlerts = data.alerts.slice(0, 7);

    // Calculate severity distribution
    const highCount = data.alerts.filter(a => a.severity === 'High').length;
    const medCount = data.alerts.filter(a => a.severity === 'Medium').length;
    const lowCount = data.alerts.filter(a => a.severity === 'Low').length;

    // Trend direction text
    const trendText = data.summary.trendDirection === 'stable' ? 'Stable' :
        data.summary.trendDirection === 'improving' ? 'Improving' : 'Worsening';

    return (
        <div className="mx-auto max-w-[1360px] space-y-5 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* ============================================================ */}
            {/* HEADER (Minimal) */}
            {/* ============================================================ */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Monitoring</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Executive risk signals and trend indicators.</p>
            </div>

            {/* ============================================================ */}
            {/* SECTION 1: EXECUTIVE SUMMARY (8 + 4 split) */}
            {/* ============================================================ */}
            <div className="grid grid-cols-12 gap-5">

                {/* Risk Snapshot (col-span-8) */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-5">Risk Snapshot</h3>

                    {/* 3 Large Metrics */}
                    <div className="grid grid-cols-3 gap-5 mb-5">
                        <div className="text-center">
                            <div className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{data.summary.activeAlerts}</div>
                            <div className="text-[12px] text-slate-500 font-medium mt-1 uppercase tracking-wide">Active Alerts</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[40px] font-bold text-red-600 dark:text-red-400 leading-none">{data.summary.highSeverity}</div>
                            <div className="text-[12px] text-slate-500 font-medium mt-1 uppercase tracking-wide">High Severity</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[40px] font-bold text-slate-900 dark:text-white leading-none flex items-center justify-center gap-2">
                                {trendText === 'Improving' && <TrendingDown size={28} className="text-emerald-500" />}
                                {trendText === 'Worsening' && <TrendingUp size={28} className="text-red-500" />}
                                {trendText === 'Stable' && <Minus size={28} className="text-slate-400" />}
                                <span className={trendText === 'Improving' ? 'text-emerald-600' : trendText === 'Worsening' ? 'text-red-600' : ''}>{trendText}</span>
                            </div>
                            <div className="text-[12px] text-slate-500 font-medium mt-1 uppercase tracking-wide">Risk Trend</div>
                        </div>
                    </div>

                    {/* Severity Distribution Bar */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">{highCount} High</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">{medCount} Medium</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">{lowCount} Low</span>
                        </div>
                    </div>
                </div>

                {/* Trend Direction (col-span-4) */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">Trend</h3>
                    <div className="h-[80px] w-full mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.riskTrend}>
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Alert Volume Trend</p>
                    <p className="text-[14px] text-slate-700 dark:text-slate-300 font-medium">{data.trendSummary || 'Alert volume stabilized vs previous period.'}</p>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: TOP ALERTS (7 max, evidence-based) */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Top Alerts</h3>
                </div>

                {/* Alert Rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {topAlerts.map((alert) => {
                        // Get primary evidence chip text
                        const evidenceText = alert.evidence && alert.evidence.length > 0
                            ? alert.evidence[0]
                            : null;

                        return (
                            <div
                                key={alert.id}
                                onClick={() => setSelectedAlert(alert)}
                                className="group flex items-center px-5 h-[64px] hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                            >
                                {/* Severity */}
                                <div className="flex items-center gap-2 w-[100px] shrink-0">
                                    <div className={`w-2 h-2 rounded-full ${alert.severity === 'High' ? 'bg-red-500' : alert.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                    <span className={`text-[12px] font-bold uppercase ${alert.severity === 'High' ? 'text-red-600 dark:text-red-400' : alert.severity === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {alert.severity}
                                    </span>
                                </div>

                                {/* Signal Title */}
                                <div className="flex-1 min-w-0 px-3">
                                    <p className="text-[14px] font-semibold text-slate-800 dark:text-white truncate">{alert.title}</p>
                                </div>

                                {/* Category Tag */}
                                <div className="w-[110px] shrink-0 px-2">
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{alert.category.split(' ')[0]}</span>
                                </div>

                                {/* Evidence Chip (MANDATORY) */}
                                <div className="w-[140px] shrink-0 px-2">
                                    {evidenceText ? (
                                        <span className="inline-flex px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[12px] font-bold rounded border border-indigo-100 dark:border-indigo-800">
                                            {evidenceText}
                                        </span>
                                    ) : (
                                        <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-400 text-[11px] font-medium rounded">
                                            Evidence unavailable
                                        </span>
                                    )}
                                </div>

                                {/* Trend */}
                                <div className="w-[50px] shrink-0 flex justify-center">
                                    {alert.trend === 'up' && <TrendingUp size={16} className="text-emerald-500" />}
                                    {alert.trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
                                    {alert.trend === 'flat' && <Minus size={16} className="text-slate-400" />}
                                </div>

                                {/* Detected */}
                                <div className="w-[70px] shrink-0 text-[13px] text-slate-500 font-mono">{alert.detected}</div>

                                {/* Chevron */}
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 3: NEXT LOOK (6 + 6 split) */}
            {/* ============================================================ */}
            <div className="grid grid-cols-12 gap-5">

                {/* What to Review Next (col-span-6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">What to Review Next</h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Revenue momentum', delta: '+8%', route: '/md/revenue', trend: 'up' },
                            { label: 'Overdue invoices trend', delta: '-5%', route: '/md/invoices', trend: 'down' },
                            { label: 'Conversion health', delta: '-1.2%', route: '/md/sales', trend: 'down' },
                            { label: 'Lead funnel health', delta: '+12%', route: '/md/leads', trend: 'up' }
                        ].map((item, i) => (
                            <div
                                key={i}
                                onClick={() => router.push(item.route)}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                            >
                                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[13px] font-bold ${item.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>{item.delta}</span>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Interpretation (col-span-6) */}
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-indigo-500" size={18} />
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">AI Interpretation</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] uppercase font-bold tracking-wide rounded">AI Advisory • Read-only</span>
                    </div>
                    <div className="space-y-3">
                        {data.aiInterpretation.slice(0, 3).map((insight, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${insight.type === 'RISK' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        insight.type === 'FINANCE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>{insight.type}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-semibold text-slate-800 dark:text-white mb-1">{insight.title}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {insight.evidence.map((ev, j) => (
                                            <span key={j} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded">{ev}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* ALERT DRAWER (Evidence-Based) */}
            {/* ============================================================ */}
            {selectedAlert && (
                <AlertDrawer
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                    riskTrend={data.riskTrend}
                    router={router}
                />
            )}
        </div>
    );
}

// --- ALERT DRAWER COMPONENT ---

function AlertDrawer({ alert, onClose, riskTrend, router }) {
    const signalDef = SIGNAL_DEFINITIONS[alert.title] || null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-xl p-6 overflow-y-auto" style={{ animation: 'slideInRight 160ms ease-out forwards' }}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Alert Details</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Title + Severity */}
                <div className="mb-5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide mb-3 ${alert.severity === 'High' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                            alert.severity === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                        }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        {alert.severity}
                    </div>
                    <h3 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">{alert.title}</h3>
                    <span className="text-[12px] text-slate-400 font-medium">{alert.category} • Detected {alert.detected}</span>
                </div>

                {/* SECTION 1: What Changed (2 lines max) */}
                <div className="mb-5">
                    <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">What Changed</h4>
                    <p className="text-[14px] text-slate-600 dark:text-slate-300 line-clamp-2">{alert.description}</p>
                </div>

                {/* SECTION 2: Evidence Metrics (REQUIRED) */}
                <div className="mb-5">
                    <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">Evidence Metrics</h4>
                    {alert.evidence && alert.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {alert.evidence.slice(0, 6).map((ev, i) => (
                                <span key={i} className="inline-flex px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[13px] font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                                    {ev}
                                </span>
                            ))}
                            {/* Current vs Previous placeholder if only 1-2 chips */}
                            {alert.evidence.length < 3 && alert.delta && (
                                <span className="inline-flex px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                                    Δ {alert.delta}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-[13px] text-slate-400 italic">Data unavailable</p>
                        </div>
                    )}
                </div>

                {/* SECTION 3: Mini Trend Chart */}
                <div className="mb-5">
                    <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">Trend</h4>
                    <div className="h-[60px] w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={riskTrend}>
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SECTION 4: Signal Definition (Read-only) */}
                {signalDef && (
                    <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-slate-400" />
                            <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold">Signal Definition</h4>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-[12px] text-slate-500">Metric Tracked</span>
                                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{signalDef.metric}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[12px] text-slate-500">Comparison</span>
                                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{signalDef.comparison}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[12px] text-slate-500">Threshold</span>
                                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{signalDef.threshold}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 5: Related Links */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-3">Open Related</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Revenue', route: '/md/revenue' },
                            { label: 'Dashboard', route: '/md/dashboard' },
                            { label: 'Points', route: '/md/points' },
                            { label: 'Sales', route: '/md/sales' }
                        ].map((link, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(link.route)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[13px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                {link.label}
                                <ArrowRight size={14} className="text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SKELETON ---

function MonitoringSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-5 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[180px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="col-span-4 h-[180px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>

            {/* Section 2: Top Alerts (7 rows) */}
            <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl">
                <div className="h-12 border-b border-slate-300 dark:border-slate-700"></div>
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-[64px] border-b border-slate-300/50 dark:border-slate-700/50"></div>
                ))}
            </div>

            {/* Section 3: Next Look */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-6 h-[200px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                <div className="col-span-6 h-[200px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
    );
}
