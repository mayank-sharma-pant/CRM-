'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    UserX,
    UsersRound,
    Clock,
    AlertCircle,
    ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            const dashData = {
                stats: [
                    { id: 1, label: 'Active Users', value: '156', route: '/admin/users' },
                    { id: 2, label: 'Pending Invites', value: '8', route: '/admin/users' },
                    { id: 3, label: 'Teams', value: '8', route: '/admin/teams-hierarchy' },
                    { id: 4, label: 'Disabled Users', value: '12', route: '/admin/users' }
                ],
                actionRequired: [
                    { id: 1, type: 'invite', title: '3 invites expiring in 48h', link: '/admin/users' },
                    { id: 2, type: 'reassign', title: '2 users need reassignment before deactivation', link: '/admin/users' },
                    { id: 3, type: 'hierarchy', title: '1 team missing manager assignment', link: '/admin/teams-hierarchy' }
                ],
                recentActivity: [
                    { id: 1, action: 'User approved', entity: 'John Miller', time: '30 min ago' },
                    { id: 2, action: 'Role changed', entity: 'Lisa Brown → Manager', time: '2 hours ago' },
                    { id: 3, action: 'Team created', entity: 'Sales Delta', time: '4 hours ago' },
                    { id: 4, action: 'User deactivated', entity: 'Mark Stevens', time: '1 day ago' },
                    { id: 5, action: 'Team shift', entity: 'Alex Johnson → Sales Alpha', time: '1 day ago' },
                    { id: 6, action: 'Invite sent', entity: 'Sarah Chen', time: '2 days ago' },
                    { id: 7, action: 'Manager changed', entity: 'Sales Bravo → James Wilson', time: '2 days ago' },
                    { id: 8, action: 'User approved', entity: 'Emily Davis', time: '3 days ago' },
                    { id: 9, action: 'Role changed', entity: 'Mike Johnson → Sales Executive', time: '3 days ago' },
                    { id: 10, action: 'Settings updated', entity: 'Pipeline stages', time: '4 days ago' }
                ]
            };
            setData(dashData);
            setLoading(false);
        }, 300);
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">System administration overview</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.stats.map((stat) => (
                    <div
                        key={stat.id}
                        onClick={() => router.push(stat.route)}
                        className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Action Required + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Action Required */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                        <AlertCircle size={16} className="text-amber-600" />
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Action Required</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {data.actionRequired.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(item.link)}
                                className="group flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'invite' ? 'bg-blue-500' : item.type === 'reassign' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.title}</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <button
                            onClick={() => router.push('/admin/audit')}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[280px] overflow-y-auto">
                        {data.recentActivity.map((item) => (
                            <div key={item.id} className="px-4 py-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                            <span className="font-medium">{item.action}</span>: {item.entity}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-4 animate-pulse">
            <div className="space-y-1">
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
        </div>
    );
}
