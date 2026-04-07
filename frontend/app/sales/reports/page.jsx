'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { motion } from 'framer-motion';
import {
  Users, Target, TrendingUp, TrendingDown, Activity, DollarSign,
  CheckCircle, Clock, AlertTriangle, Zap, BarChart3, ArrowUpRight,
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

function StatCard({ label, value, icon: Icon, color, bgColor, suffix = '', prefix = '', subtitle, trend }) {
  const animVal = useCountUp(value || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon size={18} className={color} strokeWidth={2.5} />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-0.5 text-[11px] font-bold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-0.5`}>
        {prefix}{typeof value === 'number' && value >= 1000 ? animVal.toLocaleString() : animVal}{suffix}
      </div>
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function BreakdownBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-24 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-8 text-right">{count}</span>
      <span className="text-[10px] text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

const STATUS_COLORS = {
  Active: 'bg-blue-500', Converted: 'bg-emerald-500', Lost: 'bg-red-400',
  'Lost Client': 'bg-red-300', New: 'bg-violet-500', Contacted: 'bg-sky-400',
  Qualified: 'bg-indigo-500', Proposal: 'bg-amber-500',
};
const SOURCE_COLORS = {
  Website: 'bg-blue-500', Referral: 'bg-emerald-500', 'Cold Call': 'bg-amber-500',
  LinkedIn: 'bg-indigo-500', Other: 'bg-slate-400', Unknown: 'bg-slate-300',
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
          <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Reports & Analytics</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Performance overview &mdash; {periodLabel}</p>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg flex text-xs font-bold">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Section 1: Lead Metrics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-slate-400" />
            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lead Performance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Leads" value={m.total_leads || 0} icon={Users} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Active" value={m.active_leads || 0} icon={Zap} color="text-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-900/20" subtitle="In pipeline" />
            <StatCard label="Client" value={m.closed_leads || 0} icon={Target} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label="Lost" value={m.lost_leads || 0} icon={TrendingDown} color="text-red-500" bgColor="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="Stalled" value={m.stalled_leads || 0} icon={Clock} color="text-amber-600" bgColor="bg-amber-50 dark:bg-amber-900/20" subtitle="No activity 14d+" />
            <StatCard label="Win Rate" value={m.conversion_rate || 0} icon={TrendingUp} color="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-900/20" suffix="%" />
          </div>
        </section>

        {/* Section 2: Revenue */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} className="text-slate-400" />
            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Revenue</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={Math.round(m.total_revenue || 0)} icon={DollarSign} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" prefix="₹" />
            <StatCard label="Paid" value={Math.round(m.paid_revenue || 0)} icon={CheckCircle} color="text-green-600" bgColor="bg-green-50 dark:bg-green-900/20" prefix="₹" />
            <StatCard label="Outstanding" value={Math.round(m.outstanding_revenue || 0)} icon={AlertTriangle} color="text-amber-600" bgColor="bg-amber-50 dark:bg-amber-900/20" prefix="₹" />
            <StatCard label="My Orders" value={m.my_orders || 0} icon={Briefcase} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" subtitle={m.my_revenue ? `₹${Math.round(m.my_revenue).toLocaleString()} value` : null} />
          </div>
        </section>

        {/* Section 3: Tasks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={14} className="text-slate-400" />
            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Task Metrics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Completed" value={tm.completed || 0} icon={CheckCircle} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label="In Progress" value={tm.in_progress || 0} icon={Activity} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Overdue" value={tm.overdue || 0} icon={AlertTriangle} color="text-red-500" bgColor="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="New Leads This Week" value={act.new_leads_this_week || 0} icon={CalendarDays} color="text-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-900/20" />
            <StatCard label="Tasks Done This Week" value={act.tasks_done_this_week || 0} icon={Zap} color="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-900/20" />
          </div>
        </section>

        {/* Section 4: Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pipeline Distribution</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.total_leads || 0} Total</span>
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
                        color={STATUS_COLORS[label] || 'bg-slate-400'}
                      />
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8 italic">No data available</p>
            )}
          </motion.div>

          {/* Source Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lead Sources</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Origin</span>
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
                      color={SOURCE_COLORS[item.source] || 'bg-slate-400'}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8 italic">No data available</p>
            )}
          </motion.div>
        </div>

        {/* Priority Tasks */}
        {stats?.priority_tasks && stats.priority_tasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-amber-500" />
              <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Priority Tasks</h2>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {stats.priority_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{task.dueDate || 'No due date'}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    task.statusReason === 'OVERDUE'
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                  }`}>
                    {task.statusReason === 'OVERDUE' ? 'Overdue' : 'Due Today'}
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
