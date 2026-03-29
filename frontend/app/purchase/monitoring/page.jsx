'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Activity,
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
    LineChart, Line, ResponsiveContainer
} from 'recharts';

export default function PurchaseMonitoringPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
        const fetchMonitoring = async () => {
            try {
                setLoading(true);
                const res = await api.get('/purchase/monitoring');
                const apiData = res.data;

                // Bridge backend to rich frontend format
                const enrichedData = {
                    summary: {
                        activeAlerts: apiData.alerts?.length || 0,
                        highSeverity: apiData.alerts?.filter(a => a.severity === 'High').length || 0,
                        trendDirection: apiData.summary?.trendDirection?.toLowerCase() || 'stable'
                    },
                    riskTrend: apiData.riskTrend || apiData.risk_trend || [],
                    trendSummary: apiData.metrics?.overdue_invoices > 0
                        ? `${apiData.metrics.overdue_invoices} overdue invoices require attention. Settlement rate: ${apiData.metrics.settlement_rate || 0}%`
                        : `All invoices on track. Settlement rate: ${apiData.metrics?.settlement_rate || 0}%`,
                    alerts: apiData.alerts?.map(a => ({
                        id: a.id,
                        severity: a.severity || 'Medium',
                        title: a.title || a.message || 'Procurement Alert',
                        category: a.category || a.type || 'Finance',
                        evidence: a.evidence || [a.message],
                        trend: 'flat',
                        detected: a.detected || 'Now',
                        description: a.description || a.message
                    })) || [],
                    operationalMetrics: [
                        {
                            label: 'Settlement Rate',
                            delta: `${apiData.metrics?.settlement_rate || 0}%`,
                            route: '/purchase/invoices',
                            trend: (apiData.metrics?.settlement_rate || 0) >= 50 ? 'up' : 'down'
                        },
                        {
                            label: 'Outstanding Amount',
                            delta: `₹${Number(apiData.metrics?.pending_amount || 0).toLocaleString()}`,
                            route: '/purchase/invoices',
                            trend: (apiData.metrics?.pending_amount || 0) > 0 ? 'down' : 'up'
                        }
                    ]
                };

                setData(enrichedData);
            } catch (err) {
                console.error("Failed to fetch purchase monitoring", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMonitoring();
    }, []);

    if (loading) return <MonitoringSkeleton />;

    if (!data) return (
        <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">No signals detected for selected period.</p>
        </div>
    );

    const topAlerts = data.alerts.slice(0, 7);
    const highCount = data.summary.highSeverity;
    const medCount = data.alerts.filter(a => a.severity === 'Medium').length;
    const lowCount = data.alerts.filter(a => a.severity === 'Low').length;
    const trendText = data.summary.trendDirection.charAt(0).toUpperCase() + data.summary.trendDirection.slice(1);

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Purchase Oversight Command */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Purchase Monitoring</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Procurement Control & Signal Intelligence</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Live Stream</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: EXECUTIVE SNAPSHOT */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Purchase Signal Summary</h3>
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
                            <div className="text-[32px] font-black text-error tracking-tighter tabular-nums leading-none">{highCount}</div>
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

                <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-4">Risk Trajectory</h3>
                    <div className="h-[80px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.riskTrend}>
                                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[12px] text-secondary font-bold uppercase tracking-tight mb-1 opacity-70">Detection Volume</p>
                    <p className="text-[13px] text-primary font-bold">{data.trendSummary}</p>
                </div>
            </div>

            {/* SECTION 2: SIGNAL LEDGER */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="px-5 py-3 border-b border-border bg-surface-elevated/20 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Signal Interface</h3>
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest">Real-time Stream Active</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/5">
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Severity</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Signal</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Category</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Evidence</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest text-center">Trend</th>
                                <th className="py-2.5 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Detected</th>
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
                                            {alert.category}
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
                                        <Minus size={14} className="text-muted mx-auto" strokeWidth={3} />
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

            {/* SECTION 3: OPERATIONAL METRICS */}
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-6 bg-surface rounded-md border border-border shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-5">Operational Metrics</h3>
                    <div className="space-y-1.5">
                        {(data.operationalMetrics || []).map((item, i) => (
                            <div key={i} onClick={() => router.push(item.route)} className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-elevated border border-border rounded-md cursor-pointer transition-all group">
                                <span className="text-[12px] font-bold text-secondary uppercase tracking-tight">{item.label}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`text-[12px] font-black tabular-nums font-mono ${item.trend === 'up' ? 'text-success' : 'text-error'}`}>{item.delta}</span>
                                    <ChevronRight size={14} className="text-muted group-hover:text-accent transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ALERT DRAWER */}
            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}></div>
                    <div className="relative w-full max-w-sm bg-surface h-full shadow-2xl border-l border-border p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-[16px] font-bold text-primary uppercase tracking-tight">Signal forensics</h2>
                            <button onClick={() => setSelectedAlert(null)} className="p-1 rounded-md hover:bg-surface-elevated text-muted transition-colors">
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest mb-4 ${selectedAlert.severity === 'High' ? 'bg-error/10 text-error border-error/20' :
                                    selectedAlert.severity === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                        'bg-info/10 text-info border-info/20'
                                    }`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                    {selectedAlert.severity} SEVERITY
                                </div>
                                <h3 className="text-[16px] font-bold text-primary leading-tight mb-2">{selectedAlert.title}</h3>
                                <p className="text-[13px] text-secondary font-medium leading-relaxed opacity-90">{selectedAlert.description}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] text-muted uppercase tracking-widest font-black mb-3">Evidence Matrix</h4>
                                <div className="space-y-2">
                                    {selectedAlert.evidence?.map((ev, i) => (
                                        <div key={i} className="p-2.5 bg-surface-elevated/30 border border-border rounded-md text-[12px] font-black text-accent tabular-nums font-mono">{ev}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MonitoringSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="h-10 w-48 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[180px] bg-surface rounded-md"></div>
                <div className="col-span-4 h-[180px] bg-surface rounded-md"></div>
            </div>
            <div className="h-[400px] bg-surface rounded-md"></div>
        </div>
    );
}
