'use client';

/**
 * MANAGER DASHBOARD
 * 
 * Purpose: Team Overview and Immediate Actions.
 * Scope: Strict Team Scope (Backend Driven).
 * Note: Decoupled from Sales Dashboard to fix navigation paths.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseTaskDueDate } from '../../../lib/taskDue';
import api from '../../../services/api';
import {
    Plus,
    Users,
    CheckCircle,
    Percent,
    ShieldAlert,
    ArrowRight,
    Clock,
    User
} from 'lucide-react';
import KPICard from '../../../components/shared/KPICard';
import OnboardingChecklist from '../../../components/onboarding/OnboardingChecklist';

export default function ManagerDashboard() {
    const [metrics, setMetrics] = useState({
        totalLeads: 0,
        closedLeads: 0,
        conversionRate: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        outstandingRevenue: 0
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
                api.get('/invoices').catch(() => ({ data: [] }))
            ]);
            const data = response.data;
            const invoices = invoicesRes.data?.items ?? invoicesRes.data ?? [];

            const totalRev = invoices.reduce((s, i) => s + (i.total || 0), 0);
            const paidRev = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0);

            setMetrics({
                totalLeads: data.metrics.total_team_leads,
                closedLeads: data.metrics.closed_deals,
                conversionRate: data.metrics.team_conversion_rate,
                totalRevenue: totalRev,
                paidRevenue: paidRev,
                outstandingRevenue: totalRev - paidRev
            });

            // The backend returns pre-filtered priority tasks
            setPriorityTasks(data.priority_tasks || []);
        } catch (error) {
            console.error('Dashboard fetch failed:', error);
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
                    <button
                        onClick={fetchDashboardData}
                        className="btn btn-primary"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team</h1>
                    <p className="page-subtitle">Pipeline and work that needs a manager</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/manager/leads"
                        className="btn btn-secondary"
                    >
                        Team leads
                    </Link>
                    {canAddLead && (
                        <Link
                            href="/manager/leads?action=new"
                            className="btn btn-primary"
                        >
                            <Plus size={14} strokeWidth={2.25} />
                            Add lead
                        </Link>
                    )}
                </div>
            </div>

            <div className="page-body space-y-5">
                <OnboardingChecklist />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPICard
                        label="Team leads"
                        subValue="Active pipeline"
                        value={metrics.totalLeads}
                        icon={Users}
                    />
                    <KPICard
                        label="Closed deals"
                        subValue="Converted"
                        value={metrics.closedLeads}
                        icon={CheckCircle}
                    />
                    <KPICard
                        label="Win rate"
                        subValue="Team conversion"
                        value={`${metrics.conversionRate}%`}
                        icon={Percent}
                    />
                    <KPICard
                        label="Team revenue"
                        subValue="Invoiced"
                        value={`₹${(metrics.totalRevenue / 1000).toFixed(1)}k`}
                    />
                </div>

                {metrics.totalRevenue > 0 && (
                    <div className="panel p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-medium text-secondary">Team revenue</h3>
                            <span className="font-mono text-[13px] font-medium text-primary tabular-nums">₹{metrics.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-elevated">
                            <div className="bg-success rounded-l-full" style={{ width: `${(metrics.paidRevenue / metrics.totalRevenue) * 100}%` }} />
                            <div className="bg-warning rounded-r-full" style={{ width: `${(metrics.outstandingRevenue / metrics.totalRevenue) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-2.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="text-[12px] text-secondary">Paid ₹{metrics.paidRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                                <span className="text-[12px] text-secondary">Outstanding ₹{metrics.outstandingRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="panel">
                    <div className="panel-head">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-error" size={15} />
                            <h2 className="text-[13px] font-semibold text-primary">Needs attention</h2>
                        </div>
                        <span className="text-[12px] text-muted tabular-nums">
                            {priorityTasks.length}
                        </span>
                    </div>

                    <div className="divide-y divide-border">
                        {priorityTasks.length === 0 ? (
                            <div className="p-10 text-center">
                                <CheckCircle className="text-success mx-auto mb-2" size={20} />
                                <h3 className="text-primary font-medium text-sm">Team is caught up</h3>
                                <p className="text-muted text-[13px] mt-1">No overdue team tasks.</p>
                            </div>
                        ) : (
                            priorityTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href={`/manager/tasks`}
                                    className="group flex items-center justify-between px-4 py-3 hover:bg-surface-elevated transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.statusReason === 'OVERDUE' ? 'bg-error' : 'bg-warning'}`} title={task.statusReason} />
                                        <div className="min-w-0 pr-4">
                                            <h3 className="text-[13px] font-medium text-primary truncate">
                                                {task.title}
                                            </h3>
                                            <p className="text-[12px] text-muted mt-0.5">
                                                {task.statusReason === 'OVERDUE' ? 'Overdue' : task.statusReason}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0 tabular-nums">
                                        <div className="text-right">
                                            <p className="text-[11px] text-muted mb-0.5">Due</p>
                                            <div className="text-[13px] font-medium text-secondary">
                                                {task.dueDate ? (() => { const d = parseTaskDueDate(task.dueDate); return d ? format(d, 'MMM d') : task.dueDate; })() : '—'}
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-muted group-hover:text-accent" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="border-t border-border px-4 py-2.5">
                        <Link href="/manager/tasks" className="text-[13px] font-medium text-muted hover:text-accent inline-flex items-center gap-1.5">
                            Team tasks <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
