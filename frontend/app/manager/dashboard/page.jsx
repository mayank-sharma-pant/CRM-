'use client';

/**
 * MANAGER DASHBOARD — team overview (same console chrome as Admin)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { parseTaskDueDate } from '../../../lib/taskDue';
import api from '../../../services/api';
import {
    Plus,
    CheckCircle,
    ShieldAlert,
    ArrowRight,
    AlertCircle,
} from 'lucide-react';
import OnboardingChecklist from '../../../components/onboarding/OnboardingChecklist';

export default function ManagerDashboard() {
    const router = useRouter();
    const [metrics, setMetrics] = useState({
        totalLeads: 0,
        closedLeads: 0,
        conversionRate: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        outstandingRevenue: 0,
    });
    const [priorityTasks, setPriorityTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [canAddLead, setCanAddLead] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setError(null);
            const [response, invoicesRes] = await Promise.all([
                api.get('/manager/dashboard'),
                api.get('/invoices').catch(() => ({ data: [] })),
            ]);
            const data = response.data;
            const invoices = invoicesRes.data?.items ?? invoicesRes.data ?? [];

            const totalRev = invoices.reduce((s, i) => s + (i.total || 0), 0);
            const paidRev = invoices
                .filter((i) => i.status === 'Paid')
                .reduce((s, i) => s + (i.total || 0), 0);

            setMetrics({
                totalLeads: data.metrics.total_team_leads,
                closedLeads: data.metrics.closed_deals,
                conversionRate: data.metrics.team_conversion_rate,
                totalRevenue: totalRev,
                paidRevenue: paidRev,
                outstandingRevenue: totalRev - paidRev,
            });
            setPriorityTasks(data.priority_tasks || []);
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
            setError('Unable to load manager dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
                <div className="text-[13px] text-muted animate-pulse">Loading dashboard…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
                <div className="flex flex-col items-center gap-3">
                    <div className="text-[13px] text-error">{error}</div>
                    <button type="button" onClick={fetchDashboardData} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const stats = [
        {
            id: 'leads',
            label: 'Team leads',
            value: String(metrics.totalLeads),
            hint: 'Active pipeline',
            route: '/manager/leads',
        },
        {
            id: 'closed',
            label: 'Closed deals',
            value: String(metrics.closedLeads),
            hint: 'Converted',
            route: '/manager/deals',
        },
        {
            id: 'win',
            label: 'Win rate',
            value: `${metrics.conversionRate}%`,
            hint: 'Team conversion',
            route: '/manager/reports',
        },
        {
            id: 'revenue',
            label: 'Team revenue',
            value: `₹${(metrics.totalRevenue / 1000).toFixed(1)}k`,
            hint: 'Invoiced',
            route: '/manager/invoices',
        },
    ];

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team</h1>
                    <p className="page-subtitle">Pipeline and work that needs a manager</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/manager/leads" className="btn btn-secondary">
                        Team leads
                    </Link>
                    {canAddLead && (
                        <Link href="/manager/leads?action=new" className="btn btn-primary">
                            <Plus size={14} strokeWidth={2.25} />
                            Add lead
                        </Link>
                    )}
                </div>
            </div>

            <div className="page-body space-y-5">
            <OnboardingChecklist />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat) => (
                    <div
                        key={stat.id}
                        onClick={() => router.push(stat.route)}
                        className="panel p-3 cursor-pointer hover:border-border-strong transition-colors"
                    >
                        <div className="text-[12px] font-medium text-muted mb-1">{stat.label}</div>
                        <div className="font-mono text-[22px] font-semibold text-primary tabular-nums">
                            {stat.value}
                        </div>
                        <div className="text-[12px] text-muted mt-1">{stat.hint}</div>
                    </div>
                ))}
            </div>

            {metrics.totalRevenue > 0 && (
                <div className="panel p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[13px] font-medium text-secondary">Team revenue</h3>
                        <span className="font-mono text-[13px] font-medium text-primary tabular-nums">
                            ₹{metrics.totalRevenue.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-elevated">
                        <div
                            className="bg-success rounded-l-full"
                            style={{ width: `${(metrics.paidRevenue / metrics.totalRevenue) * 100}%` }}
                        />
                        <div
                            className="bg-warning rounded-r-full"
                            style={{
                                width: `${(metrics.outstandingRevenue / metrics.totalRevenue) * 100}%`,
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="text-[12px] text-secondary">
                                Paid ₹{metrics.paidRevenue.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                            <span className="text-[12px] text-secondary">
                                Outstanding ₹{metrics.outstandingRevenue.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="panel">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                        <AlertCircle size={16} className="text-warning" />
                        <h3 className="text-[13px] font-medium text-secondary">Needs attention</h3>
                        <span className="ml-auto text-[12px] text-muted tabular-nums">
                            {priorityTasks.length}
                        </span>
                    </div>
                    <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                        {priorityTasks.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <CheckCircle className="text-success mx-auto mb-2" size={18} />
                                <p className="text-sm font-medium text-primary">Team is caught up</p>
                                <p className="text-[13px] text-muted mt-1">No overdue team tasks.</p>
                            </div>
                        ) : (
                            priorityTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => router.push('/manager/tasks')}
                                    className="group flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                task.statusReason === 'OVERDUE' ? 'bg-error' : 'bg-warning'
                                            }`}
                                        />
                                        <div className="min-w-0">
                                            <span className="text-sm text-secondary truncate block">
                                                {task.title}
                                            </span>
                                            <span className="text-[11px] text-muted">
                                                {task.statusReason === 'OVERDUE'
                                                    ? 'Overdue'
                                                    : task.statusReason}
                                                {task.dueDate
                                                    ? ` · ${(() => {
                                                          const d = parseTaskDueDate(task.dueDate);
                                                          return d ? format(d, 'MMM d') : task.dueDate;
                                                      })()}`
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight
                                        size={14}
                                        className="text-muted group-hover:text-primary shrink-0"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border">
                        <Link
                            href="/manager/tasks"
                            className="text-xs font-medium text-muted hover:text-primary inline-flex items-center gap-1"
                        >
                            Team tasks <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>

                <div className="panel">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                        <ShieldAlert size={16} className="text-muted" />
                        <h3 className="text-[13px] font-medium text-secondary">Quick links</h3>
                    </div>
                    <div className="divide-y divide-border">
                        {[
                            { label: 'Unassigned pool', href: '/manager/leads/unassigned' },
                            { label: 'Team board', href: '/manager/team' },
                            { label: 'Deals', href: '/manager/deals' },
                            { label: 'Reports', href: '/manager/reports' },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated transition-colors"
                            >
                                <span className="text-sm text-secondary group-hover:text-primary">
                                    {item.label}
                                </span>
                                <ArrowRight
                                    size={14}
                                    className="text-muted group-hover:text-primary"
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
