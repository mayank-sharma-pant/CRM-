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
                <div className="text-[13px] text-muted font-bold uppercase tracking-widest animate-pulse">Loading dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
                <div className="flex flex-col items-center gap-3">
                    <div className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</div>
                    <button
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page pb-8">
            {/* Top Bar - Solid & Precise */}
            <div className="bg-surface border-b border-border px-6 py-4 mb-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight">
                            Team Dashboard
                        </h1>
                        <p className="text-[13px] text-muted font-medium mt-0.5 opacity-80">
                            Real-time metrics and priority attention items
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/manager/leads"
                            className="px-3 py-1.5 text-[13px] font-semibold text-secondary bg-surface border border-border rounded-md hover:bg-surface-elevated transition-colors shadow-sm"
                        >
                            View Team Leads
                        </Link>
                        {canAddLead && (
                            <Link
                                href="/manager/leads?action=new"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[13px] font-bold transition-all shadow-sm"
                            >
                                <Plus size={14} strokeWidth={3} />
                                Add Lead
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 space-y-8">

                {/* 1. Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <KPICard
                        label="Team Leads"
                        subValue="Active Pipeline"
                        value={metrics.totalLeads}
                        icon={Users}
                    />
                    <KPICard
                        label="Closed Deals"
                        subValue="Converted (Team)"
                        value={metrics.closedLeads}
                        icon={CheckCircle}
                        color="text-emerald-600"
                    />
                    <KPICard
                        label="Team Win Rate"
                        subValue="Conversion %"
                        value={`${metrics.conversionRate}%`}
                        icon={Percent}
                    />
                    <KPICard
                        label="Team Revenue"
                        subValue="Total Invoiced"
                        value={`₹${(metrics.totalRevenue / 1000).toFixed(1)}k`}
                        icon={ArrowRight}
                        color="text-accent"
                    />
                </div>

                {/* Revenue Breakdown */}
                {metrics.totalRevenue > 0 && (
                    <div className="bg-surface rounded border border-border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[12px] font-bold text-muted uppercase tracking-wider">Team Revenue Breakdown</h3>
                            <span className="text-[13px] font-bold text-primary">${metrics.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-surface-elevated">
                            <div className="bg-success rounded-l-full transition-all" style={{ width: `${(metrics.paidRevenue / metrics.totalRevenue) * 100}%` }} />
                            <div className="bg-warning rounded-r-full transition-all" style={{ width: `${(metrics.outstandingRevenue / metrics.totalRevenue) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-success" />
                                <span className="text-[11px] font-semibold text-secondary">Paid: ${metrics.paidRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-warning" />
                                <span className="text-[11px] font-semibold text-secondary">Outstanding: ${metrics.outstandingRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Priority Tasks - Solid Tool Look */}
                <div className="bg-surface dark:bg-slate-900 rounded border border-border overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface-elevated/30">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-error" size={16} />
                            <h2 className="text-[15px] font-bold text-primary">Team Attention Required</h2>
                        </div>
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider bg-surface border border-border px-2 py-0.5 rounded tabular-nums">
                            {priorityTasks.length} Signals
                        </span>
                    </div>

                    <div className="divide-y divide-border/50">
                        {priorityTasks.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="text-success" size={20} />
                                </div>
                                <h3 className="text-primary font-bold text-sm">All Systems Nominal</h3>
                                <p className="text-muted text-[13px] mt-0.5 font-medium">No urgent team signals identified.</p>
                            </div>
                        ) : (
                            priorityTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href={`/manager/tasks`}
                                    className="group flex items-center justify-between px-5 py-3 hover:bg-surface-elevated/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.statusReason === 'OVERDUE' ? 'bg-error animate-pulse' : 'bg-warning'}`} title={task.statusReason} />
                                        <div className="min-w-0 pr-4">
                                            <h3 className="text-[13px] font-semibold text-primary truncate group-hover:text-accent transition-colors">
                                                {task.title}
                                            </h3>
                                            <p className="text-[11px] text-muted font-medium mt-0.5 uppercase tracking-wide opacity-70">
                                                High Priority &bull; {task.statusReason}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 flex-shrink-0 tabular-nums">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-0.5 opacity-60">Due Date</p>
                                            <div className="flex items-center justify-end gap-1.5 text-[13px] font-bold text-secondary">
                                                {task.dueDate ? (() => { const d = parseTaskDueDate(task.dueDate); return d ? format(d, 'MMM d') : task.dueDate; })() : '—'}
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-border-strong group-hover:text-accent transition-all group-hover:translate-x-0.5" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="bg-surface-elevated/30 border-t border-border px-5 py-2.5">
                        <Link href="/manager/tasks" className="text-[12px] font-bold text-muted hover:text-accent flex items-center gap-1.5 transition-colors uppercase tracking-tight">
                            View Full Team Activity <ArrowRight size={12} strokeWidth={2.5} />
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
