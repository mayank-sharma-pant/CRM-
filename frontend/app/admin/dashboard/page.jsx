'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    UserCheck,
    Users,
    UsersRound,
    UserX,
    ChevronRight,
    Clock,
    Shield
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            // Mock admin dashboard data
            const dashData = {
                kpis: [
                    { id: 1, label: 'Pending Approvals', value: '8', change: '+2', trend: 'up', route: '/admin/approvals' },
                    { id: 2, label: 'Active Users', value: '156', change: '+5', trend: 'up', route: '/admin/users' },
                    { id: 3, label: 'Disabled Users', value: '12', change: '0', trend: 'neutral', route: '/admin/users' },
                    { id: 4, label: 'Teams', value: '8', change: '+1', trend: 'up', route: '/admin/teams' }
                ],
                pendingApprovals: [
                    { id: 1, name: 'John Miller', email: 'john.miller@example.com', requestedRole: 'Sales Executive', submittedAt: '2 hours ago' },
                    { id: 2, name: 'Sarah Chen', email: 'sarah.chen@example.com', requestedRole: 'Manager', submittedAt: '5 hours ago' },
                    { id: 3, name: 'Mike Johnson', email: 'mike.j@example.com', requestedRole: 'Sales Executive', submittedAt: '1 day ago' },
                    { id: 4, name: 'Emily Davis', email: 'emily.d@example.com', requestedRole: 'Sales Executive', submittedAt: '1 day ago' },
                    { id: 5, name: 'Robert Wilson', email: 'r.wilson@example.com', requestedRole: 'Purchase', submittedAt: '2 days ago' }
                ],
                recentChanges: [
                    { id: 1, action: 'User Approved', entity: 'Alex Thompson', actor: 'Admin', time: '30 min ago' },
                    { id: 2, action: 'Role Changed', entity: 'Lisa Brown → Manager', actor: 'Admin', time: '2 hours ago' },
                    { id: 3, action: 'Team Created', entity: 'Sales Team Delta', actor: 'Admin', time: '4 hours ago' },
                    { id: 4, action: 'User Deactivated', entity: 'Mark Stevens', actor: 'Admin', time: '1 day ago' }
                ]
            };
            setData(dashData);
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Dashboard</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">System overview and pending authorizations.</p>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.kpis.map((kpi) => (
                    <div
                        key={kpi.id}
                        onClick={() => router.push(kpi.route)}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-[110px] flex flex-col justify-between hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <span className="text-[36px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* Pending Approvals + Recent Changes */}
            <div className="grid grid-cols-12 gap-5">

                {/* Pending Approvals */}
                <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Pending Approvals</h3>
                        <button
                            onClick={() => router.push('/admin/approvals')}
                            className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {data.pendingApprovals.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => router.push('/admin/approvals')}
                                className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <UserCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{item.name}</div>
                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{item.requestedRole}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-slate-400">{item.submittedAt}</span>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Changes + Quick Actions */}
                <div className="col-span-12 lg:col-span-5 space-y-5">

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => router.push('/admin/approvals')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors group"
                            >
                                <UserCheck size={18} className="text-slate-400 group-hover:text-indigo-600" />
                                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Approve Member</span>
                                <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-indigo-500" />
                            </button>
                            <button
                                onClick={() => router.push('/admin/teams')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors group"
                            >
                                <UsersRound size={18} className="text-slate-400 group-hover:text-indigo-600" />
                                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Create Team</span>
                                <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-indigo-500" />
                            </button>
                            <button
                                onClick={() => router.push('/admin/hierarchy')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors group"
                            >
                                <Shield size={18} className="text-slate-400 group-hover:text-indigo-600" />
                                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Assign Manager</span>
                                <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-indigo-500" />
                            </button>
                        </div>
                    </div>

                    {/* Recent Changes */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Recent Changes</h3>
                            <button
                                onClick={() => router.push('/admin/audit')}
                                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                            >
                                Audit Log <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {data.recentChanges.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <Clock size={14} className="text-slate-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-[13px] text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{item.action}</span>: {item.entity}
                                        </p>
                                        <p className="text-[11px] text-slate-400">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BadgeChange({ change, trend }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    let Icon = Minus;

    if (trend === 'up') {
        colors = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
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
                <div className="col-span-7 h-[300px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-5 h-[300px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        </div>
    );
}
