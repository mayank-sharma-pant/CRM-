'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Receipt,
    ShoppingCart,
    Activity,
    ChevronRight,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BrainCircuit
} from 'lucide-react';

export default function PurchaseDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            // Mock purchase dashboard data
            const dashData = {
                kpis: [
                    { id: 1, label: 'Pending Approvals', value: '18', change: '+3', trend: 'up', route: '/purchase/sales' },
                    { id: 2, label: 'Approved Today', value: '12', change: '+5', trend: 'up', route: '/purchase/sales' },
                    { id: 3, label: 'Rejected Today', value: '2', change: '-1', trend: 'down', route: '/purchase/sales' },
                    { id: 4, label: 'Overdue Invoices', value: '8', change: '+2', trend: 'up', route: '/purchase/invoices' }
                ],
                approvalQueue: [
                    { id: 1, client: 'BigBank International', amount: '$45,000', type: 'Enterprise', date: '2024-01-10', priority: 'high' },
                    { id: 2, client: 'TechFlow Inc.', amount: '$12,500', type: 'SMB', date: '2024-01-09', priority: 'medium' },
                    { id: 3, client: 'CloudNet Corp', amount: '$8,200', type: 'SMB', date: '2024-01-07', priority: 'low' }
                ],
                invoiceHealth: {
                    paid: 145,
                    pending: 24,
                    overdue: 8,
                    draft: 12
                },
                monitoringHighlights: [
                    { id: 1, title: 'High discount rate detected', severity: 'Medium', time: '2h ago' },
                    { id: 2, title: 'Invoice collection delay', severity: 'High', time: '4h ago' }
                ]
            };
            setData(dashData);
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <DashboardSkeleton />;

    const totalInvoices = data.invoiceHealth.paid + data.invoiceHealth.pending + data.invoiceHealth.overdue + data.invoiceHealth.draft;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Dashboard</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Purchase Department overview and pending actions.</p>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.kpis.map((kpi) => (
                    <div
                        key={kpi.id}
                        onClick={() => router.push(kpi.route)}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-[110px] flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <span className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* Approval Queue + Invoice Health */}
            <div className="grid grid-cols-12 gap-5">

                {/* Approval Queue */}
                <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Approval Queue</h3>
                        <button
                            onClick={() => router.push('/purchase/sales')}
                            className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {data.approvalQueue.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/purchase/sales/${item.id}`)}
                                className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">{item.client}</div>
                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{item.type} | {item.date}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">{item.amount}</span>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invoice Health */}
                <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Invoice Health</h3>
                        <button
                            onClick={() => router.push('/purchase/invoices')}
                            className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                        >
                            Details <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <InvoiceHealthBar label="Paid" value={data.invoiceHealth.paid} total={totalInvoices} color="emerald" icon={CheckCircle} />
                        <InvoiceHealthBar label="Pending" value={data.invoiceHealth.pending} total={totalInvoices} color="amber" icon={Clock} />
                        <InvoiceHealthBar label="Overdue" value={data.invoiceHealth.overdue} total={totalInvoices} color="red" icon={AlertTriangle} />
                        <InvoiceHealthBar label="Draft" value={data.invoiceHealth.draft} total={totalInvoices} color="slate" icon={Receipt} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between text-[12px]">
                            <span className="text-slate-500">Total Invoices</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalInvoices}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions + Monitoring Highlights */}
            <div className="grid grid-cols-12 gap-5">

                {/* Quick Actions */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <button
                            onClick={() => router.push('/purchase/sales')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition-colors group"
                        >
                            <ShoppingCart size={18} className="text-slate-400 group-hover:text-emerald-600" />
                            <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Review Sales</span>
                            <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                        </button>
                        <button
                            onClick={() => router.push('/purchase/invoices')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition-colors group"
                        >
                            <Receipt size={18} className="text-slate-400 group-hover:text-emerald-600" />
                            <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Manage Invoices</span>
                            <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                        </button>
                        <button
                            onClick={() => router.push('/purchase/monitoring')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition-colors group"
                        >
                            <Activity size={18} className="text-slate-400 group-hover:text-emerald-600" />
                            <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">View Monitoring</span>
                            <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                        </button>
                        <button
                            onClick={() => router.push('/purchase/ai-assistant')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition-colors group"
                        >
                            <BrainCircuit size={18} className="text-slate-400 group-hover:text-emerald-600" />
                            <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">AI Assistant</span>
                            <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                        </button>
                    </div>
                </div>

                {/* Monitoring Highlights */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Monitoring Highlights</h3>
                        <button
                            onClick={() => router.push('/purchase/monitoring')}
                            className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {data.monitoringHighlights.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${item.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                    <div>
                                        <p className="text-[14px] font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                            {item.severity}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[11px] text-slate-400">{item.time}</span>
                            </div>
                        ))}
                        {data.monitoringHighlights.length === 0 && (
                            <div className="py-6 text-center text-slate-400 text-[13px]">No active alerts</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InvoiceHealthBar({ label, value, total, color, icon: Icon }) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colorClasses = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
        slate: 'bg-slate-400'
    };
    const textClasses = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        slate: 'text-slate-500'
    };

    return (
        <div className="flex items-center gap-3">
            <Icon size={14} className={textClasses[color]} />
            <div className="flex-1">
                <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{label}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{value}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClasses[color]} rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        </div>
    );
}

function BadgeChange({ change, trend }) {
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
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${colors}`}>
            <Icon size={11} strokeWidth={2.5} />
            {change}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-7 h-[220px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-5 h-[220px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-4 h-[200px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-8 h-[200px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        </div>
    );
}
