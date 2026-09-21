'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { motion } from 'framer-motion';
import {
  Users, Target, TrendingUp, TrendingDown, Activity, DollarSign,
  CheckCircle, Clock, AlertTriangle, Zap, ArrowUpRight,
  ArrowDownRight, Minus, Briefcase, CalendarDays
} from 'lucide-react';

const PERIODS = [
  { id: 'week', label: '7 Days' },
  { id: 'month', label: '30 Days' },
  { id: 'year', label: '1 Year' },
  { id: 'all', label: 'All Time' },
];

function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime;
    let frame;
    const animate = (time) => {
      if (!startTime) startTime = time;
      const pct = Math.min((time - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 4);
      setCount(Math.floor(end * ease));
      if (pct < 1) frame = requestAnimationFrame(animate);
      else setCount(end);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);
  return count;
}

function StatCard({ label, value, icon: Icon, suffix = '', prefix = '', subtitle, trend }) {
  const animVal = useCountUp(value || 0);
  return (
    <div className="bg-surface border border-border rounded-md p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        {trend !== undefined && trend !== null ? (
          <div className={`flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-muted'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        ) : Icon ? (
          <Icon size={14} className="text-muted" strokeWidth={1.75} />
        ) : null}
      </div>
      <div className="font-mono text-[22px] font-semibold tracking-tight text-primary tabular-nums">
        {prefix}{typeof value === 'number' && value >= 1000 ? animVal.toLocaleString() : animVal}{suffix}
      </div>
      {subtitle && <p className="text-[12px] text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function BreakdownBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-secondary w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[13px] font-medium text-primary w-8 text-right tabular-nums">{count}</span>
      <span className="text-[12px] text-muted w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

const STATUS_COLORS = {
  Active: 'bg-info', Converted: 'bg-success', Lost: 'bg-error',
  'Lost Client': 'bg-error', New: 'bg-accent', Contacted: 'bg-info',
  Qualified: 'bg-accent', Proposal: 'bg-warning',
};
const SOURCE_COLORS = {
  Website: 'bg-info', Referral: 'bg-success', 'Cold Call': 'bg-warning',
  LinkedIn: 'bg-accent', Other: 'bg-muted', Unknown: 'bg-border-strong',
};

export default function Reports({ dashboardEndpoint = '/leads/dashboard' }) {
  const [period, setPeriod] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (period !== 'all') params.period = period;
      const res = await api.get(dashboardEndpoint, { params });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const m = stats?.metrics || {};
  const tm = stats?.task_metrics || {};
  const act = stats?.activity || {};
  const statusData = stats?.leadsByStatus || [];
  const sourceData = stats?.leadsBySource || [];

  const periodLabel = PERIODS.find(p => p.id === period)?.label || 'All Time';

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-muted">Loading reports…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Performance — {periodLabel}</p>
        </div>
        <div className="bg-surface-elevated p-0.5 rounded-md flex text-[13px] font-medium border border-border">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-[5px] transition-colors ${
                  period === p.id
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {p.label}
              </button>
            ))}
        </div>
      </div>

      <div className="page-body space-y-8">

        <section>
          <h2 className="dashboard-section-title">Leads</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={m.total_leads || 0} icon={Users} />
            <StatCard label="Active" value={m.active_leads || 0} icon={Zap} subtitle="In pipeline" />
            <StatCard label="Client" value={m.closed_leads || 0} icon={Target} />
            <StatCard label="Lost" value={m.lost_leads || 0} icon={TrendingDown} />
            <StatCard label="Stalled" value={m.stalled_leads || 0} icon={Clock} subtitle="No activity 14d+" />
            <StatCard label="Win rate" value={m.conversion_rate || 0} icon={TrendingUp} suffix="%" />
          </div>
        </section>

        <section>
          <h2 className="dashboard-section-title">Revenue</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={Math.round(m.total_revenue || 0)} icon={DollarSign} prefix="₹" />
            <StatCard label="Paid" value={Math.round(m.paid_revenue || 0)} icon={CheckCircle} prefix="₹" />
            <StatCard label="Outstanding" value={Math.round(m.outstanding_revenue || 0)} icon={AlertTriangle} prefix="₹" />
            <StatCard label="My orders" value={m.my_orders || 0} icon={Briefcase} subtitle={m.my_revenue ? `₹${Math.round(m.my_revenue).toLocaleString()}` : null} />
          </div>
        </section>

        <section>
          <h2 className="dashboard-section-title">Tasks</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Completed" value={tm.completed || 0} icon={CheckCircle} />
            <StatCard label="In progress" value={tm.in_progress || 0} icon={Activity} />
            <StatCard label="Overdue" value={tm.overdue || 0} icon={AlertTriangle} />
            <StatCard label="New leads this week" value={act.new_leads_this_week || 0} icon={CalendarDays} />
            <StatCard label="Tasks done this week" value={act.tasks_done_this_week || 0} icon={Zap} />
          </div>
        </section>

        {/* Section 4: Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="panel p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-primary">Pipeline</h3>
              <span className="text-[12px] text-muted tabular-nums">{m.total_leads || 0} total</span>
            </div>
            {statusData.length > 0 ? (
              <div className="space-y-3">
                {statusData
                  .sort((a, b) => b.count - a.count)
                  .map((item) => {
                    const label = typeof item.status === 'object' ? item.status?.value || String(item.status) : String(item.status);
                    return (
                      <BreakdownBar
                        key={label}
                        label={label}
                        count={parseInt(item.count)}
                        total={m.total_leads || 1}
                        color={STATUS_COLORS[label] || 'bg-muted'}
                      />
                    );
                  })}
              </div>
            ) : (
              <p className="text-[13px] text-muted text-center py-8">No data yet</p>
            )}
          </motion.div>

          {/* Source Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="panel p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-primary">Sources</h3>
            </div>
            {sourceData.length > 0 ? (
              <div className="space-y-3">
                {sourceData
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <BreakdownBar
                      key={item.source}
                      label={item.source || 'Unknown'}
                      count={parseInt(item.count)}
                      total={m.total_leads || 1}
                      color={SOURCE_COLORS[item.source] || 'bg-muted'}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted text-center py-8">No data yet</p>
            )}
          </motion.div>
        </div>

        {/* Priority Tasks */}
        {stats?.priority_tasks && stats.priority_tasks.length > 0 && (
          <section>
            <h2 className="dashboard-section-title">Priority tasks</h2>
            <div className="panel divide-y divide-border">
              {stats.priority_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-primary">{task.title}</p>
                    <p className="text-[12px] text-muted mt-0.5">{task.dueDate || 'No due date'}</p>
                  </div>
                  <span className={`badge ${
                    task.statusReason === 'OVERDUE' ? 'badge-error' : 'badge-warning'
                  }`}>
                    {task.statusReason === 'OVERDUE' ? 'Overdue' : 'Due today'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
