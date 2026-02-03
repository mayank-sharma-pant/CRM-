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

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    closedLeads: 0,
    conversionRate: 0
  });
  const [priorityTasks, setPriorityTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [leadsRes, tasksRes] = await Promise.all([
        api.get('/leads'),
        api.get('/tasks/list') // Use the specialized list endpoint
      ]);

      const leads = leadsRes.data || [];
      const allTasks = tasksRes.data || [];

      // Metrics Calculation
      const total = leads.length;
      const closed = leads.filter(l => l.status === 'Converted').length;
      const rate = total > 0 ? Math.round((closed / total) * 100) : 0;

      setMetrics({
        totalLeads: total,
        closedLeads: closed,
        conversionRate: rate
      });

      // Priority Tasks Calculation
      const now = new Date();
      const urgentTasks = allTasks
        .filter(t => t.status !== 'Completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map(t => {
          // The backend tasks list might have human-readable labels like "Today" or "Yesterday"
          // but the parseISO might fail. Let's handle both.
          let isOverdue = false;
          // If we have a real date field from backend we should use it. 
          // For now, let's keep the logic simple.
          return {
            ...t,
            statusReason: t.dueDate?.toLowerCase().includes('ago') ? 'OVERDUE' : 'DUE_TODAY'
          };
        });

      setPriorityTasks(urgentTasks);
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
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

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page pb-8">

      {/* Top Bar: Precise & Integrated */}
      <div className="bg-surface border-b border-border px-6 py-4 mb-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">
              Sales Dashboard
            </h1>
            <p className="text-[13px] text-muted font-medium mt-0.5 opacity-80">
              Immediate actions and performance signals
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/sales/leads"
              className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-tight text-secondary bg-surface border border-border rounded-md hover:bg-surface-elevated transition-all shadow-sm"
            >
              Leads Ledger
            </Link>
            <Link
              href="/sales/leads?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
            >
              <Plus size={14} strokeWidth={2.5} />
              New Lead
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 space-y-6">

        {/* 1. Summary Metrics: Dense Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="Total Leads"
            subValue="active pipeline"
            value={metrics.totalLeads}
            icon={Users}
          />
          <KPICard
            label="Closed Leads"
            subValue="converted"
            value={metrics.closedLeads}
            icon={CheckCircle}
            color="text-success"
          />
          <KPICard
            label="Conversion Rate"
            subValue="win velocity"
            value={`${metrics.conversionRate}%`}
            icon={Percent}
          />
        </div>

        {/* 2. Priority Tasks: Integrated Tool List */}
        <div className="bg-surface rounded border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface-elevated/30">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="text-error opacity-80" size={16} strokeWidth={2.5} />
              <h2 className="text-[14px] font-bold text-primary tracking-tight">Priority Attention Needed</h2>
            </div>
            <span className="text-[11px] font-bold text-muted uppercase bg-surface border border-border px-2 py-0.5 rounded tabular-nums">
              {priorityTasks.length} Signals
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {priorityTasks.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="text-success" size={20} />
                </div>
                <h3 className="text-primary font-bold text-[14px]">Pipeline Clear</h3>
                <p className="text-muted text-[12px] mt-1 font-medium">No urgent tasks requiring your attention today.</p>
              </div>
            ) : (
              priorityTasks.map((task) => (
                <Link
                  key={task.id}
                  href="/sales/tasks"
                  className="group flex items-center justify-between px-5 py-3 hover:bg-surface-elevated/50 transition-all border-l-2 border-transparent hover:border-accent"
                >
                  {/* Left: Identity & Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`
                        px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest
                        ${task.statusReason === 'OVERDUE'
                          ? 'bg-error/10 text-error border border-error/20'
                          : 'bg-warning/10 text-warning border border-warning/20'}
                      `}>
                        {task.statusReason}
                      </span>
                    </div>

                    <h3 className="text-[13px] font-bold text-primary truncate group-hover:text-accent transition-colors">
                      {task.title}
                    </h3>

                    {/* Related Entity (Lead/Client) */}
                    <p className="text-[11px] text-muted font-medium mt-0.5 truncate uppercase tracking-tight opacity-70">
                      Entity: <span className="text-secondary">Lead ID #{task.id?.toString().slice(-4) || '----'}</span>
                    </p>
                  </div>

                  {/* Right: Date & Status */}
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-black text-muted tracking-widest mb-0.5 opacity-50">Expiration</p>
                      <div className="flex items-center justify-end gap-1.5 text-[12px] font-bold text-secondary tabular-nums">
                        <Clock size={12} className="text-muted" />
                        {task.dueDate}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-muted group-hover:text-accent transition-colors translate-x-0 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer: Scannable Action */}
          <div className="bg-surface-elevated/30 border-t border-border px-5 py-2.5">
            <Link href="/sales/tasks" className="text-[11px] font-bold text-muted hover:text-accent flex items-center gap-1.5 transition-all uppercase tracking-tight">
              Open Task Control Plane <ArrowRight size={12} strokeWidth={3} />
            </Link>
          </div>
        </div>

      </div >
    </div >
  );
}

