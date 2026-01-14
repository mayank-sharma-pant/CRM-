'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    User,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    X,
    ArrowRight,
    AlertTriangle,
    Info
} from 'lucide-react';
import {
    LineChart, Line, ResponsiveContainer
} from 'recharts';

// Mock employee database
const EMPLOYEE_DATABASE = {
    'EMP001': {
        id: 'EMP001',
        name: 'Alex Johnson',
        role: 'Sales Executive',
        team: 'Sales Alpha',
        reportingTo: 'Sarah Miller (Manager)',
        kpis: [
            { label: 'Leads Handled', value: '48', change: '+12%', trend: 'up' },
            { label: 'Conversion %', value: '24%', change: '+3%', trend: 'up' },
            { label: 'Sales Count', value: '12', change: '+8%', trend: 'up' },
            { label: 'Revenue', value: '$125k', change: '+15%', trend: 'up' },
            { label: 'Follow-up Health', value: '92%', change: '-2%', trend: 'down' },
            { label: 'SLA Breaches', value: '2', change: '-1', trend: 'down' },
            { label: 'Overdue Ratio', value: '4%', change: '-2%', trend: 'down' },
            { label: 'Alerts', value: '1', change: '0', trend: 'flat' }
        ],
        trends: {
            sales: [45, 52, 48, 55, 62, 58, 68],
            conversion: [22, 24, 23, 25, 24, 26, 24],
            activity: [85, 88, 82, 90, 92, 88, 94]
        },
        signals: [
            { id: 1, severity: 'Low', title: 'High activity spike', evidence: ['Activity: +18%'], detected: '2d ago', description: 'Unusually high lead engagement in last 48h.' }
        ]
    },
    'EMP002': {
        id: 'EMP002',
        name: 'Sarah Miller',
        role: 'Manager',
        team: 'Sales Alpha',
        reportingTo: 'James Chen (Director)',
        kpis: [
            { label: 'Team Leads', value: '185', change: '+8%', trend: 'up' },
            { label: 'Team Conv %', value: '22%', change: '-1%', trend: 'down' },
            { label: 'Team Sales', value: '45', change: '+12%', trend: 'up' },
            { label: 'Team Revenue', value: '$420k', change: '+18%', trend: 'up' },
            { label: 'Avg Response', value: '2.4h', change: '-15m', trend: 'up' },
            { label: 'SLA Health', value: '94%', change: '+2%', trend: 'up' },
            { label: 'Escalations', value: '3', change: '+1', trend: 'up' },
            { label: 'Alerts', value: '2', change: '+1', trend: 'up' }
        ],
        trends: {
            sales: [380, 395, 405, 412, 418, 425, 420],
            conversion: [23, 22, 23, 21, 22, 22, 22],
            activity: [88, 90, 85, 92, 88, 91, 90]
        },
        signals: [
            { id: 1, severity: 'Medium', title: 'Conversion dip detected', evidence: ['Conv: -1%', 'vs Team avg'], detected: '1d ago', description: 'Team conversion rate slightly below baseline.' },
            { id: 2, severity: 'Low', title: 'Escalation increase', evidence: ['Esc: +1'], detected: '3d ago', description: 'Minor increase in client escalations.' }
        ]
    }
};

export default function MDEmployeeLookupPage() {
    const router = useRouter();
    const [employeeId, setEmployeeId] = useState('');
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('escalation'); // escalation | incentive
    const [selectedSignal, setSelectedSignal] = useState(null);
    const [trendTab, setTrendTab] = useState('sales');

    const handleLookup = () => {
        if (!employeeId.trim()) {
            setError('Please enter an Employee ID');
            return;
        }

        setLoading(true);
        setError('');
        setEmployee(null);

        // Simulate API call
        setTimeout(() => {
            const found = EMPLOYEE_DATABASE[employeeId.toUpperCase()];
            if (found) {
                setEmployee(found);
            } else {
                setError('Employee not found. Please verify the ID.');
            }
            setLoading(false);
        }, 600);
    };

    return (
        <div className="mx-auto max-w-[1360px] space-y-5 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* ============================================================ */}
            {/* SECTION 1: PAGE HEADER */}
            {/* ============================================================ */}
            <div>
                <div className="flex items-center gap-2 text-[12px] text-slate-400 font-medium mb-2">
                    <span>MD</span>
                    <span>/</span>
                    <span>Employee Lookup</span>
                </div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Employee Performance Lookup</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Read-only snapshot by Employee ID (for escalation & incentive review).</p>
            </div>

            {/* Purpose Banner */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <Info size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Lookup-only performance snapshot</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Intended for escalation / incentive review. No operational controls available.</p>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: LOOKUP CONTROL */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Find Employee</h3>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => { setEmployeeId(e.target.value); setError(''); }}
                            onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                            placeholder="Enter Employee ID (e.g., EMP001)"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                        />
                    </div>
                    <button
                        onClick={handleLookup}
                        disabled={loading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-[14px] hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Looking up...' : 'Lookup'}
                    </button>
                </div>
                {error && (
                    <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle size={14} />
                        <span className="text-[13px] font-medium">{error}</span>
                    </div>
                )}
                {!employee && !loading && !error && (
                    <p className="mt-3 text-[13px] text-slate-400">Enter Employee ID to view performance snapshot.</p>
                )}
            </div>

            {/* ============================================================ */}
            {/* LOADING STATE */}
            {/* ============================================================ */}
            {loading && <LookupSkeleton />}

            {/* ============================================================ */}
            {/* SECTION 3: EMPLOYEE SNAPSHOT (After successful lookup) */}
            {/* ============================================================ */}
            {employee && !loading && (
                <div className="space-y-5" style={{ animation: 'fadeIn 200ms ease-out' }}>

                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] text-slate-500 font-medium">Mode:</span>
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setMode('escalation')}
                                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${mode === 'escalation' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    Escalation
                                </button>
                                <button
                                    onClick={() => setMode('incentive')}
                                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${mode === 'incentive' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    Incentive Review
                                </button>
                            </div>
                        </div>
                        {mode === 'incentive' && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">This snapshot supports incentive review. Final decisions occur outside this screen.</span>
                        )}
                    </div>

                    {/* A) Identity Strip */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <User size={28} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-[20px] font-bold text-slate-900 dark:text-white">{employee.name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[13px] text-slate-500 font-mono">{employee.id}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded uppercase">{employee.role}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[12px] text-slate-400">Team</div>
                                <div className="text-[14px] font-medium text-slate-700 dark:text-slate-300">{employee.team}</div>
                                <div className="text-[11px] text-slate-400 mt-1">Reports to: {employee.reportingTo}</div>
                            </div>
                        </div>
                    </div>

                    {/* B) Performance Summary (8 KPI Cards) */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Performance Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {employee.kpis.map((kpi, i) => (
                                <div key={i} className={`p-4 rounded-xl border ${mode === 'incentive' && (kpi.label.includes('Conv') || kpi.label.includes('Revenue') || kpi.label.includes('Sales')) ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</span>
                                        <BadgeChange change={kpi.change} trend={kpi.trend} small />
                                    </div>
                                    <div className="text-[24px] font-bold text-slate-900 dark:text-white">{kpi.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* C) Trend & Signals (8 + 4 split) */}
                    <div className="grid grid-cols-12 gap-5">

                        {/* C1) Trend Panel */}
                        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Trends</h3>
                                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                    {['sales', 'conversion', 'activity'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setTrendTab(tab)}
                                            className={`px-3 py-1 text-[12px] font-medium rounded-md capitalize transition-colors ${trendTab === tab ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={employee.trends[trendTab].map((v, i) => ({ i, value: v }))}>
                                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[13px] text-slate-500 mt-3">
                                {trendTab === 'sales' && 'Sales activity trend over the period.'}
                                {trendTab === 'conversion' && 'Conversion rate trend over the period.'}
                                {trendTab === 'activity' && 'Overall activity score trend over the period.'}
                            </p>
                        </div>

                        {/* C2) Signals Panel */}
                        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Signals</h3>
                            {employee.signals.length > 0 ? (
                                <div className="space-y-2">
                                    {employee.signals.slice(0, 5).map((signal) => (
                                        <div
                                            key={signal.id}
                                            onClick={() => setSelectedSignal(signal)}
                                            className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${signal.severity === 'High' ? 'bg-red-500' : signal.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{signal.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded">{signal.evidence[0]}</span>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[13px] text-slate-400">No signals detected for this employee.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* SIGNAL DRAWER */}
            {/* ============================================================ */}
            {selectedSignal && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSignal(null)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-xl p-6 overflow-y-auto" style={{ animation: 'slideInRight 160ms ease-out forwards' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Signal Details</h2>
                            <button onClick={() => setSelectedSignal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Severity + Title */}
                        <div className="mb-5">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide mb-3 ${selectedSignal.severity === 'High' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                    selectedSignal.severity === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                }`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                {selectedSignal.severity}
                            </div>
                            <h3 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">{selectedSignal.title}</h3>
                            <span className="text-[12px] text-slate-400 font-medium">Detected {selectedSignal.detected}</span>
                        </div>

                        {/* Evidence */}
                        <div className="mb-5">
                            <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">Evidence</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedSignal.evidence.map((ev, i) => (
                                    <span key={i} className="inline-flex px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[13px] font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                                        {ev}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Why This Matters */}
                        <div className="mb-5">
                            <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">Why This Matters</h4>
                            <p className="text-[14px] text-slate-600 dark:text-slate-300 line-clamp-2">{selectedSignal.description}</p>
                        </div>

                        {/* Mini Trend Chart */}
                        <div className="mb-5">
                            <h4 className="text-[11px] text-slate-400 uppercase tracking-wide font-bold mb-2">Trend</h4>
                            <div className="h-[60px] w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[40, 45, 42, 48, 52, 50, 55].map((v, i) => ({ i, value: v }))}>
                                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Link to Monitoring */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => router.push('/md/monitoring')}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[14px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                Open Monitoring
                                <ArrowRight size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUBCOMPONENTS ---

function BadgeChange({ change, trend, small }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    let Icon = Minus;

    if (trend === 'up') {
        colors = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        Icon = TrendingUp;
    } else if (trend === 'down') {
        colors = 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        Icon = TrendingDown;
    }

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${colors} ${small ? 'text-[9px]' : 'text-[10px]'}`}>
            <Icon size={small ? 10 : 11} strokeWidth={2.5} />
            {change}
        </div>
    );
}

function LookupSkeleton() {
    return (
        <div className="space-y-5 animate-pulse">
            <div className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-[200px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[280px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-4 h-[280px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        </div>
    );
}
