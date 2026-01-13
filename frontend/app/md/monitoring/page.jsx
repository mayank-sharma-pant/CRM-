'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    TrendingUp,
    TrendingDown,
    Minus,
    Filter,
    Search,
    ChevronRight,
    X,
    ArrowRight,
    BrainCircuit,
    Calendar,
    RefreshCw
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

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
        }, 600);
    }, []);

    if (loading) return <MonitoringSkeleton />;

    if (!data) return <div className="p-12 text-center text-slate-500">No monitoring data available.</div>;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8 relative">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Monitoring</h1>
                    <p className="text-[16px] text-slate-500 dark:text-slate-400 font-medium mt-1">Company-wide risks, anomalies, and trend signals.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors">
                        <Calendar size={18} className="text-slate-400" />
                        <span>Last 30 Days</span>
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <Filter size={16} />
                        <span>Severity: All</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 rounded-lg">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: RISK SUMMARY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Risk Index" value={data.summary.riskIndex} sublabel="vs prev period" delta="Stable" trend="stable" />
                <StatCard label="Active Alerts" value={data.summary.activeAlerts} sublabel="vs prev period" delta="+2" trend="up" inverseTrend />
                <StatCard label="High Severity" value={data.summary.highSeverity} sublabel="Attention Needed" delta="+1" trend="up" inverseTrend highlight />
                <StatCard label="Trend Direction" value={data.summary.trendDirection} sublabel="Overall Context" delta="Flat" trend="neutral" />
            </div>

            {/* SECTION 2: RISK TREND */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Risk Trend</h3>
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button className="px-3 py-1 text-[13px] font-medium rounded-md bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white">Daily</button>
                        <button className="px-3 py-1 text-[13px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Weekly</button>
                    </div>
                </div>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.riskTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={12} />
                            <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dx={-4} domain={[70, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" activeDot={{ r: 6, fill: '#fff', stroke: '#ef4444', strokeWidth: 3 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                    <Activity size={18} className="text-slate-500 mt-0.5" />
                    <p className="text-[14px] text-slate-700 dark:text-slate-300 font-medium">{data.trendSummary}</p>
                </div>
            </div>

            {/* SECTION 3: ALERT CATEGORY OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {data.categories.map((cat) => (
                    <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-[15px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{cat.name}</h4>
                            <span className="text-[24px] font-bold text-slate-900 dark:text-white">{cat.total}</span>
                        </div>
                        <div className="flex gap-2 mb-4">
                            {cat.high > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-bold rounded dark:bg-red-900/30 dark:text-red-400">{cat.high} High</span>}
                            {cat.medium > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded dark:bg-amber-900/30 dark:text-amber-400">{cat.medium} Med</span>}
                            {cat.low > 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded dark:bg-slate-700 dark:text-slate-400">{cat.low} Low</span>}
                        </div>
                        <div className="h-8 w-full opacity-50">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cat.trend.map((v, i) => ({ i, v }))}>
                                    <Line type="monotone" dataKey="v" stroke="#64748b" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTION 4: ACTIVE ALERTS TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 gap-4">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">Active Alerts</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search alerts..." className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[13px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                        </div>
                        <div className="flex gap-2">
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[12px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 transition-colors">Category</span>
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[12px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 transition-colors">Severity</span>
                        </div>
                    </div>
                </div>
                <div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700/30 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Severity</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Signal</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Category</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Impacted</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Trend</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Detected</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {data.alerts.map((alert) => (
                                <tr
                                    key={alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                    className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors h-[64px] ${selectedAlert?.id === alert.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <td className="px-6">
                                        <SeverityBadge severity={alert.severity} />
                                    </td>
                                    <td className="px-6">
                                        <div className="text-[14px] font-semibold text-slate-800 dark:text-white">{alert.title}</div>
                                        <div className="text-[12px] text-slate-500 truncate max-w-[240px]">{alert.description}</div>
                                    </td>
                                    <td className="px-6 text-[13px] text-slate-600 dark:text-slate-300">{alert.category}</td>
                                    <td className="px-6">
                                        <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-medium rounded border border-slate-200 dark:border-slate-600">{alert.metric}</span>
                                    </td>
                                    <td className="px-6">
                                        <TrendIcon trend={alert.trend} />
                                    </td>
                                    <td className="px-6 text-[13px] text-slate-500 font-mono">{alert.detected}</td>
                                    <td className="px-6 text-right">
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 5: TREND WATCHLIST & AI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Watchlist */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-6">Trend Watchlist</h3>
                    <div className="space-y-4">
                        {data.watchlist.map((item, i) => (
                            <div key={i} onClick={() => router.push(item.link)} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200 w-32">{item.name}</span>
                                <div className="flex-1 h-8 mx-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={item.trend.map((v, i) => ({ i, v }))}>
                                            <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <span className={`text-[13px] font-bold ${item.delta.startsWith('+') ? 'text-emerald-600' : item.delta.startsWith('-') ? 'text-red-600' : 'text-slate-500'}`}>{item.delta}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Interpretation */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-indigo-600" size={20} />
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">AI Interpretation</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold tracking-wide rounded">Read Only</span>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {data.aiInterpretation.map((insight, i) => (
                            <div key={i} className="bg-white/60 dark:bg-slate-700/40 p-4 rounded-xl border border-indigo-50 dark:border-slate-600 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{insight.type}</span>
                                </div>
                                <p className="text-[14px] font-semibold text-slate-800 dark:text-white mb-3">{insight.title}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                        {insight.evidence.map((ev, j) => (
                                            <span key={j} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded">{ev}</span>
                                        ))}
                                    </div>
                                    <button onClick={() => router.push(insight.link)} className="text-[12px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                        View Analytics <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                </div>
            </div>

            {/* DRAWER */}
            <AlertDrawer alert={selectedAlert} onClose={() => setSelectedAlert(null)} />

        </div>
    );
}

// --- SUBCOMPONENTS ---

function StatCard({ label, value, sublabel, delta, trend, inverseTrend, highlight }) {
    let deltaColor = 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
    let Icon = Minus;

    // Logic: Up is normally Green (good). Inverse means Up is Red (bad, e.g. more alerts).
    if (trend === 'up') {
        if (inverseTrend) {
            deltaColor = 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
            Icon = TrendingUp;
        } else {
            deltaColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
            Icon = TrendingUp;
        }
    } else if (trend === 'down') {
        if (inverseTrend) {
            deltaColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
            Icon = TrendingDown;
        } else {
            deltaColor = 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
            Icon = TrendingDown;
        }
    }

    return (
        <div className={`h-[110px] p-5 rounded-2xl border flex flex-col justify-between ${highlight ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
            <div className="flex justify-between items-start">
                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${deltaColor}`}>
                    <Icon size={12} strokeWidth={2.5} />
                    {delta}
                </div>
            </div>
            <div>
                <div className={`text-[36px] font-bold leading-none ${highlight ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{value}</div>
                <div className="text-[12px] text-slate-400 font-medium mt-1">{sublabel}</div>
            </div>
        </div>
    )
}

function SeverityBadge({ severity }) {
    const styles = {
        High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        Low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide ${styles[severity] || styles.Low}`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current`}></div>
            {severity}
        </div>
    );
}

function TrendIcon({ trend }) {
    if (trend === 'up') return <TrendingUp size={18} className="text-emerald-500" />;
    if (trend === 'down') return <TrendingDown size={18} className="text-red-500" />;
    if (trend === 'flat') return <Minus size={18} className="text-slate-400" />;
    return null;
}

function AlertDrawer({ alert, onClose }) {
    const router = useRouter();
    if (!alert) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-[400px] bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slide-in-right p-6 flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <X size={20} />
                </button>

                <div className="mt-8 mb-6">
                    <SeverityBadge severity={alert.severity} />
                    <h2 className="text-[20px] font-bold text-slate-900 dark:text-white mt-3 mb-1">{alert.title}</h2>
                    <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                        <span>{alert.category}</span>
                        <span>•</span>
                        <span>Detected {alert.detected}</span>
                    </div>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">Impact Evidence</h4>
                        <div className="flex flex-wrap gap-2">
                            {alert.evidence?.map((ev, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[13px] font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {ev}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">Alert Context</h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                {alert.description} <br /><br />
                                This signal indicates a deviation from the expected baseline for {alert.metric}. Immediate monitoring is recommended to determine if this is a transient anomaly or a sustained trend.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">Related Analytics</h4>
                    <button
                        onClick={() => router.push(alert.relatedLink)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                    >
                        <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">View {alert.category.split(' ')[0]} Reports</span>
                        <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MonitoringSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-6 animate-pulse">
            <div className="h-10 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>
            <div className="h-[320px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="grid grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-[140px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
            </div>
        </div>
    )
}
