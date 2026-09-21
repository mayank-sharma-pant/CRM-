'use client';

/**
 * DASHBOARD - Sales Executive Execution View
 * 
 * Purpose: Immediate action focus. No analytics. 
 * Pattern: Backend-driven data rendering.
 * 
 * Sections:
 * 1. Metrics (Total, Closed, Conversion)
 * 2. Priority Tasks (Overdue/Today)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import {
  Plus,
  Users,
  CheckCircle,
  Percent,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  User
} from 'lucide-react';
import KPICard from '../../../components/shared/KPICard';
import OnboardingChecklist from '../../../components/onboarding/OnboardingChecklist';

export default function Dashboard() {
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/leads/dashboard');
      const data = res.data;

      setMetrics({
        totalLeads: data.metrics.total_leads,
        closedLeads: data.metrics.closed_leads,
        conversionRate: data.metrics.conversion_rate,
        totalRevenue: data.metrics.total_revenue,
        paidRevenue: data.metrics.paid_revenue,
        outstandingRevenue: data.metrics.outstanding_revenue
      });

      setPriorityTasks(data.priority_tasks);
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
      setError('Unable to load sales dashboard. Please try again.');
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
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales</h1>
                    <p className="page-subtitle">What needs attention today</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/sales/leads" className="btn btn-secondary">
                        View leads
                    </Link>
                    <Link href="/sales/leads?action=new" className="btn btn-primary">
                        <Plus size={14} strokeWidth={2.25} />
                        New lead
                    </Link>
                </div>
            </div>

            <div className="page-body space-y-5">
                <OnboardingChecklist />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPICard
                        label="Total leads"
                        subValue="Active pipeline"
                        value={metrics.totalLeads}
                        icon={Users}
                    />
                    <KPICard
                        label="Closed"
                        subValue="Converted"
                        value={metrics.closedLeads}
                        icon={CheckCircle}
                    />
                    <KPICard
                        label="Win rate"
                        subValue="Closed / total"
                        value={`${metrics.conversionRate}%`}
                        icon={Percent}
                    />
                    <KPICard
                        label="Revenue"
                        subValue="Invoiced"
                        value={`₹${(metrics.totalRevenue / 1000).toFixed(1)}k`}
                    />
                </div>

                {metrics.totalRevenue > 0 && (
                    <div className="panel p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-medium text-secondary">Revenue</h3>
                            <span className="font-mono text-[13px] font-medium text-primary tabular-nums">₹{metrics.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-elevated">
                            <div
                                className="bg-success rounded-l-full"
                                style={{ width: `${(metrics.paidRevenue / metrics.totalRevenue) * 100}%` }}
                            />
                            <div
                                className="bg-warning rounded-r-full"
                                style={{ width: `${(metrics.outstandingRevenue / metrics.totalRevenue) * 100}%` }}
                            />
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
                            <ShieldAlert className="text-error" size={15} strokeWidth={2} />
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
                                <h3 className="text-primary font-medium text-sm">You're caught up</h3>
                                <p className="text-muted text-[13px] mt-1">No overdue or due-today tasks.</p>
                            </div>
                        ) : (
                            priorityTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href="/sales/tasks"
                                    className="group flex items-center justify-between px-4 py-3 hover:bg-surface-elevated transition-colors"
                                >
                                    <div className="flex-1 min-w-0 pr-6">
                                        <span className={`inline-block mb-1 badge ${task.statusReason === 'OVERDUE' ? 'badge-error' : 'badge-warning'}`}>
                                            {task.statusReason === 'OVERDUE' ? 'Overdue' : task.statusReason}
                                        </span>
                                        <h3 className="text-[13px] font-medium text-primary truncate">
                                            {task.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[11px] text-muted mb-0.5">Due</p>
                                            <div className="flex items-center justify-end gap-1.5 text-[13px] text-secondary tabular-nums">
                                                <Clock size={12} className="text-muted" />
                                                {task.dueDate}
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-muted group-hover:text-accent" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="border-t border-border px-4 py-2.5">
                        <Link href="/sales/tasks" className="text-[13px] font-medium text-muted hover:text-accent inline-flex items-center gap-1.5">
                            All tasks <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

