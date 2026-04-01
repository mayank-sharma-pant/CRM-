'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    X,
    ArrowRight,
    Info,
    Calendar
} from 'lucide-react';
import {
    LineChart, Line
} from 'recharts';
import ChartWrapper from '../../../components/shared/ChartWrapper';


// Signal definitions for each alert type (read-only reference)
const SIGNAL_DEFINITIONS = {
    'Liquidity Gap Projected': { metric: 'Projected Cashflow', comparison: 'End of Period vs Safety Threshold', threshold: '₹50k buffer' },
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
        const fetchMonitoring = async () => {
            try {
                setLoading(true);
                const res = await api.get('/md/monitoring');
                const apiData = res.data;

                const riskTrend = apiData.risk_trend || [];
                let trendDirection = 'stable';
                let trendSummary = "System parameters stabilized.";
                
                if (riskTrend.length >= 2) {
                    const todayVal = riskTrend[riskTrend.length - 1].value;
                    const yestVal = riskTrend[riskTrend.length - 2].value;
                    if (todayVal > yestVal) {
                        trendDirection = 'worsening';
                        trendSummary = `Risk signals increased by ${todayVal - yestVal} compared to yesterday.`;
                    } else if (todayVal < yestVal) {
                        trendDirection = 'improving';
                        trendSummary = `Risk signals decreased by ${yestVal - todayVal} compared to yesterday.`;
                    } else {
                        trendDirection = 'stable';
                        trendSummary = `Risk volume remained stable at ${todayVal} signals.`;
                    }
                }

                // Bridge backend to rich frontend format
                const enrichedData = {
                    summary: {
                        activeAlerts: apiData.alerts?.length || 0,
                        highSeverity: apiData.alerts?.filter(a => a.severity === 'High').length || 0,
                        trendDirection: trendDirection
                    },
                    riskTrend: riskTrend,
                    trendSummary: trendSummary,
                    alerts: apiData.alerts?.map(a => ({
                        id: a.id,
                        severity: a.severity || 'Medium',
                        title: a.title || 'System Alert',
                        category: a.type || 'General',
                        evidence: [a.message],
                        trend: trendDirection === 'worsening' ? 'up' : trendDirection === 'improving' ? 'down' : 'flat',
                        detected: 'Today',
                        description: a.message
                    })) || [],
                    aiInterpretation: apiData.ai_interpretation || []
                };

                setData(enrichedData);
            } catch (err) {
                console.error("Failed to fetch MD monitoring", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMonitoring();
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
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Executive Risk Command */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">System Monitoring</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Executive Risk Signals & Trend Matrix</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Live Stream</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: EXECUTIVE SUMMARY (8 + 4 split) */}
            <div className="grid grid-cols-12 gap-5">

                {/* Risk Snapshot (col-span-8) */}
                <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Executive Risk Snapshot</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">{highCount} Critical</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">{medCount} Warning</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <div className="text-[32px] font-black text-primary tracking-tighter tabular-nums leading-none">{data.summary.activeAlerts}</div>
                            <div className="text-[10px] text-muted font-black uppercase tracking-widest mt-2">Active Signals</div>
                        </div>
                        <div>
                            <div className="text-[32px] font-black text-error tracking-tighter tabular-nums leading-none">{data.summary.highSeverity}</div>
                            <div className="text-[10px] text-muted font-black uppercase tracking-widest mt-2">Critical Path</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {trendText === 'Improving' && <TrendingDown size={28} className="text-success" strokeWidth={3} />}
                                {trendText === 'Worsening' && <TrendingUp size={28} className="text-error" strokeWidth={3} />}
                                {trendText === 'Stable' && <Minus size={28} className="text-muted" strokeWidth={3} />}
                                <span className={`text-[20px] font-black uppercase tracking-tight ${trendText === 'Improving' ? 'text-success' :
                                    trendText === 'Worsening' ? 'text-error' :
                                        'text-primary'
                                    }`}>
                                    {trendText}
                                </span>
                            </div>
                            <div className="text-[10px] text-muted font-black uppercase tracking-widest mt-2">Velocity Vector</div>
                        </div>
                    </div>
                </div>

                {/* Trend Direction (col-span-4) */}
                <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-4">Risk Trajectory</h3>
                    <div className="h-[80px] w-full mb-4">
                        <ChartWrapper width="100%" height="100%">
                            <LineChart data={data.riskTrend}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--color-accent)"
                                    strokeWidth={3}
                                    dot={false}
                                />
                            </LineChart>
                        </ChartWrapper>
                    </div>
                    <p className="text-[12px] text-secondary font-bold uppercase tracking-tight mb-1 opacity-70">Detection Volume</p>
                    <p className="text-[13px] text-primary font-bold">{data.trendSummary || 'System parameters stabilized.'}</p>
                </div>
            </div>

            {/* SECTION 2: ALERT LEDGER (Swiss Design Style) */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="px-5 py-3 border-b border-border bg-surface-elevated/20 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Signal Interface</h3>
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest">Real-time Synchronization Active</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/5">
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Severity</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Signal</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Domain</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Forensic Evidence</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest text-center">Trend</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Detection</th>
                                <th className="py-2.5 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {topAlerts.map((alert, idx) => (
                                <tr
                                    key={alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                    className={`group hover:bg-surface-elevated/50 cursor-pointer transition-all border-l-2 border-transparent hover:border-accent ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-3 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'High' ? 'bg-error animate-pulse' : alert.severity === 'Medium' ? 'bg-warning' : 'bg-info'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${alert.severity === 'High' ? 'text-error' :
                                                alert.severity === 'Medium' ? 'text-warning' :
                                                    'text-info'
                                                }`}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-5 text-[13px] font-bold text-primary group-hover:text-accent transition-colors">{alert.title}</td>
                                    <td className="py-3 px-5">
                                        <span className="text-[10px] font-black text-muted uppercase tracking-widest bg-surface-elevated px-1.5 py-0.5 rounded-[4px] border border-border">
                                            {alert.category.split(' ')[0]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-5">
                                        <div className="flex flex-wrap gap-1.5">
                                            {alert.evidence?.slice(0, 1).map((ev, i) => (
                                                <span key={i} className="text-[11px] font-bold text-accent px-2 py-0.5 bg-accent/5 border border-accent/10 rounded-[4px]">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                        {alert.trend === 'up' && <TrendingUp size={14} className="text-success mx-auto" strokeWidth={3} />}
                                        {alert.trend === 'down' && <TrendingDown size={14} className="text-error mx-auto" strokeWidth={3} />}
                                        {alert.trend === 'flat' && <Minus size={14} className="text-muted mx-auto" strokeWidth={3} />}
                                    </td>
                                    <td className="py-3 px-5 text-[12px] font-bold text-muted uppercase tracking-tight font-mono">{alert.detected}</td>
                                    <td className="py-3 px-5 text-right w-10">
                                        <ChevronRight size={14} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 3: ANALYTICS */}
            <div className="grid grid-cols-12 gap-5">

                {/* What to Review Next */}
                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-5">Analytic Continuations</h3>
                    <div className="space-y-1.5">
                        {[
                            { label: 'Revenue Momentum Matrix', delta: '+8.4%', route: '/md/revenue', trend: 'up' },
                            { label: 'Settlement Latency Ledger', delta: '-4.2%', route: '/md/invoices', trend: 'down' },
                            { label: 'Conversion Velocity Index', delta: '-1.2%', route: '/md/sales', trend: 'down' },
                            { label: 'Funnel Integrity Audit', delta: '+12.1%', route: '/md/leads', trend: 'up' }
                        ].map((item, i) => (
                            <div
                                key={i}
                                onClick={() => router.push(item.route)}
                                className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-elevated border border-border rounded-md cursor-pointer transition-all group"
                            >
                                <span className="text-[12px] font-bold text-secondary uppercase tracking-tight">{item.label}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`text-[12px] font-black tabular-nums font-mono ${item.trend === 'up' ? 'text-success' : 'text-error'}`}>{item.delta}</span>
                                    <ChevronRight size={14} className="text-muted group-hover:text-accent transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-5">Executive Brief</h3>
                    <div className="space-y-3 flex-1">
                        {data.aiInterpretation && data.aiInterpretation.slice(0, 3).map((insight, i) => (
                            <div key={i} className="flex items-start gap-4 p-3 bg-surface-elevated/30 rounded-md border border-border/50">
                                <span className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] border ${insight.type === 'RISK' ? 'bg-error/10 text-error border-error/20' :
                                    insight.type === 'FINANCE' ? 'bg-success/10 text-success border-success/20' :
                                        'bg-info/10 text-info border-info/20'
                                    }`}>
                                    {insight.type}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-primary mb-1.5 leading-tight">{insight.title}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {insight.evidence.map((ev, j) => (
                                            <span key={j} className="text-[10px] font-bold text-muted uppercase tracking-tight px-1.5 py-0.5 bg-surface border border-border rounded-[4px]">{ev}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ALERT DRAWER (Refined for Enterprise Alpha) */}
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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-surface h-full shadow-2xl border-l border-border p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[16px] font-bold text-primary uppercase tracking-tight"> forensics analysis</h2>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-elevated text-muted transition-colors">
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Title + Severity */}
                <div className="mb-8">
                    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest mb-4 ${alert.severity === 'High' ? 'bg-error/10 text-error border-error/20' :
                        alert.severity === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                            'bg-info/10 text-info border-info/20'
                        }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        {alert.severity} SEVERITY
                    </div>
                    <h3 className="text-[16px] font-bold text-primary leading-tight mb-2">{alert.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest">
                        <span>{alert.category}</span>
                        <span>•</span>
                        <span>Detected {alert.detected}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* forensics Observation */}
                    <div>
                        <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-3"> forensics Observation</h4>
                        <p className="text-[13px] text-secondary font-medium leading-relaxed opacity-90">{alert.description}</p>
                    </div>

                    {/* Evidence Matrix */}
                    <div>
                        <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-3">Evidence Matrix</h4>
                        {alert.evidence && alert.evidence.length > 0 ? (
                            <div className="space-y-2">
                                {alert.evidence.slice(0, 6).map((ev, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 bg-surface-elevated/30 border border-border rounded-md">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Signal Value</span>
                                        <span className="text-[12px] font-black text-accent tabular-nums font-mono">{ev}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-surface-elevated/20 rounded-md border border-border border-dashed text-center">
                                <p className="text-[11px] text-muted font-bold uppercase tracking-tight italic opacity-50">Forensic data synchronized</p>
                            </div>
                        )}
                    </div>

                    {/* Trajectory */}
                    <div>
                        <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-3">Trajectory Vector</h4>
                        <div className="h-[60px] w-full bg-surface-elevated/20 rounded-md border border-border p-2">
                            <ChartWrapper width="100%" height="100%">
                                <LineChart data={riskTrend}>
                                    <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ChartWrapper>
                        </div>
                    </div>

                    {/* Operational Definition */}
                    {signalDef && (
                        <div className="p-4 bg-surface-elevated/40 rounded-md border border-border">
                            <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                                <Info size={14} className="opacity-50" />
                                Operational Definition
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Metric Class</span>
                                    <span className="text-[11px] font-black text-primary uppercase tracking-tight">{signalDef.metric}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Delta Reference</span>
                                    <span className="text-[11px] font-black text-primary uppercase tracking-tight">{signalDef.comparison}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Alert Threshold</span>
                                    <span className="text-[11px] font-black text-error uppercase tracking-tight">{signalDef.threshold}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigational Anchors */}
                <div className="mt-8 pt-6 border-t border-border">
                    <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-4">Integrations</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Revenue Matrix', route: '/md/revenue' },
                            { label: 'Control Plane', route: '/md/dashboard' },
                            { label: 'Incentive Engine', route: '/md/points' },
                            { label: 'Sales Ledger', route: '/md/sales' }
                        ].map((link, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(link.route)}
                                className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-elevated border border-border rounded-md text-[11px] font-bold text-secondary transition-all group"
                            >
                                {link.label}
                                <ChevronRight size={12} className="text-muted group-hover:text-accent transition-all" />
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
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-surface border border-border rounded"></div>
                    <div className="h-4 w-64 bg-surface border border-border rounded"></div>
                </div>
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[180px] bg-surface border border-border rounded-md"></div>
                <div className="col-span-4 h-[180px] bg-surface border border-border rounded-md"></div>
            </div>
            <div className="bg-surface border border-border rounded-md h-[400px]"></div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-6 h-[200px] bg-surface border border-border rounded-md"></div>
                <div className="col-span-6 h-[200px] bg-surface border border-border rounded-md"></div>
            </div>
        </div>
    );
}
