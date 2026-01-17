'use client';

import { useState, useEffect } from 'react';
import { MOCK_DATA } from '../../../services/mockData';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    ChevronRight,
    X
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function PurchaseMonitoringPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            // Use monitoring data, filter for finance-related
            const monitoringData = MOCK_DATA['/md/monitoring'] || {};
            // Filter alerts to finance-related categories
            const financeAlerts = (monitoringData.alerts || []).filter(
                a => a.category === 'Invoice Risk' || a.metric === 'Cashflow' || a.metric === 'Margin'
            );
            setData({
                ...monitoringData,
                alerts: financeAlerts.length > 0 ? financeAlerts : (monitoringData.alerts || []).slice(0, 5)
            });
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <MonitoringSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Monitoring</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Finance-related alerts and risk signals.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Active Alerts</div>
                    <div className="text-[32px] font-bold text-slate-900 dark:text-white">{data?.summary?.activeAlerts || 0}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">High Severity</div>
                    <div className="text-[32px] font-bold text-red-600 dark:text-red-400">{data?.summary?.highSeverity || 0}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Trend</div>
                    <div className="text-[32px] font-bold text-slate-900 dark:text-white capitalize">{data?.summary?.trendDirection || 'Stable'}</div>
                </div>
            </div>

            {/* Risk Trend Chart */}
            {data?.riskTrend && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Risk Trend (7 Days)</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.riskTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff' }} />
                                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Active Alerts</h3>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {(data?.alerts || []).map((alert) => (
                        <div
                            key={alert.id}
                            onClick={() => setSelectedAlert(alert)}
                            className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${alert.severity === 'High' ? 'bg-red-500' : alert.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                <div>
                                    <div className="text-[13px] font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">{alert.title}</div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{alert.severity} | {alert.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[12px] text-slate-500 dark:text-slate-400">{alert.detected}</span>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert Drawer */}
            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-xl p-6 overflow-y-auto" style={{ animation: 'slideInRight 160ms ease-out forwards' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Alert Details</h2>
                            <button onClick={() => setSelectedAlert(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase ${selectedAlert.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    selectedAlert.severity === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                {selectedAlert.severity}
                            </span>
                            <h3 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">{selectedAlert.title}</h3>
                            <p className="text-[14px] text-slate-600 dark:text-slate-400">{selectedAlert.description}</p>
                            {selectedAlert.evidence && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-2">Evidence</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedAlert.evidence.map((ev, i) => (
                                            <span key={i} className="text-[12px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">{ev}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MonitoringSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
            </div>
            <div className="h-[250px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
