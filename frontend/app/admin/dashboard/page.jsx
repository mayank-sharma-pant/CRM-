'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
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
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/admin/dashboard/stats');
                const stats = response.data;

                // Transform API response to dashboard format
                const dashData = {
                    stats: stats.stats || [],
                    actionRequired: stats.action_required || [],
                    recentActivity: (stats.recent_activity || []).map((item, idx) => ({
                        id: item.id || idx + 1,
                        action: item.action,
                        entity: item.entity,
                        time: item.time
                    }))
                };
                setData(dashData);
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
                setError('Failed to load dashboard data. Please retry.');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <DashboardSkeleton />;

    if (error) {
        return (
            <div className="mx-auto max-w-[1360px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">
                <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="text-sm font-bold text-red-600 uppercase tracking-widest">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1360px] space-y-4 pb-8 px-4 sm:px-6 text-primary">

            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">Admin</h1>
                <p className="text-sm text-muted mt-0.5">Users, teams, and approvals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.stats.map((stat) => (
                    <div
                        key={stat.id}
                        onClick={() => router.push(stat.route)}
                        className="bg-surface rounded-lg border border-border p-3 cursor-pointer hover:border-border-strong transition-colors"
                    >
                        <div className="text-[12px] font-medium text-muted mb-1">{stat.label}</div>
                        <div className="font-mono text-[22px] font-semibold text-primary tabular-nums">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Action Required + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Action Required */}
                <div className="bg-surface rounded-lg border border-border">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                        <AlertCircle size={16} className="text-warning" />
                        <h3 className="text-sm font-semibold text-primary">Action Required</h3>
                    </div>
                    <div className="divide-y divide-border">
                        {data.actionRequired.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <p className="text-sm text-muted">Nothing waiting right now</p>
                            </div>
                        ) : data.actionRequired.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(item.link)}
                                className="group flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'invite' ? 'bg-info' : item.type === 'reassign' ? 'bg-warning' : 'bg-error'}`}></div>
                                    <span className="text-sm text-secondary">{item.title}</span>
                                </div>
                                <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-surface rounded-lg border border-border">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-muted" />
                            <h3 className="text-sm font-semibold text-primary">Recent Activity</h3>
                        </div>
                        <button
                            onClick={() => router.push('/admin/audit')}
                            className="text-xs font-medium text-muted hover:text-primary"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                        {data.recentActivity.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <p className="text-sm text-muted">No recent activity</p>
                            </div>
                        ) : data.recentActivity.map((item) => (
                            <div key={item.id} className="px-4 py-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-secondary truncate">
                                            <span className="font-medium text-primary">{item.action}</span>: {item.entity}
                                        </p>
                                        <p className="text-[10px] text-muted mt-0.5">{item.time}</p>
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
