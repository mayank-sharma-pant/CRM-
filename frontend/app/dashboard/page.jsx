'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../services/api';
import { format } from 'date-fns';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { VARIANTS, TRANSITIONS } from '../../lib/motion';
import {
  Users,
  CheckCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  MoreHorizontal,
  Phone,
  Calendar
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, todayRes, overdueRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/follow-ups/today'),
        api.get('/follow-ups/overdue'),
      ]);
      setStats(statsRes.data);
      setTodayFollowUps(todayRes.data);
      setOverdueFollowUps(overdueRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeFollowUp = async (id) => {
    try {
      await api.put(`/follow-ups/${id}`, { status: 'Completed' });
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to complete follow-up:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const priorityList = [
    ...overdueFollowUps.map(f => ({ ...f, type: 'overdue' })),
    ...todayFollowUps.map(f => ({ ...f, type: 'today' }))
  ];

  return (
    <motion.div
      variants={VARIANTS.page}
      initial="hidden"
      animate="show"
      className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] bg-page"
    >
      {/* --- TOP BAR: Header & Actions --- */}
      <motion.div variants={VARIANTS.header} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Command Center
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">
              Live
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {format(new Date(), 'EEEE, MMMM do, yyyy')} • Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            All Leads
          </Link>
          <Link
            href="/leads?action=new"
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>+ New Lead</span>
          </Link>
        </div>
      </motion.div>

      {/* --- KEY METRICS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Leads"
          value={stats?.totalLeads || 0}
          trend="+12%"
          trendLabel="vs last week"
          trendPositive={true}
          icon={<Users size={18} />}
          color="blue"
        />
        <MetricCard
          label="Closed Deals"
          value={stats?.convertedLeads || 0}
          trend="-2%"
          trendLabel="Needs focus"
          trendPositive={false}
          icon={<CheckCircle size={18} />}
          color="emerald"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          trend="+5.4%"
          trendLabel="Healthy"
          trendPositive={true}
          icon={<TrendingUp size={18} />}
          color="indigo"
        />
        <MetricCard
          label="Pipeline Value"
          value="$42.5k"
          trend="Active"
          trendLabel="7 deals"
          trendPositive={true}
          icon={<Activity size={18} />}
          color="amber"
        />
      </div>

      {/* --- MAIN DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- LEFT: PRIORITY FOCUS (2/3 width) --- */}
        <motion.div variants={VARIANTS.card} className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex-1 bg-card rounded-xl border border-master shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-subtle flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Priority Focus</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                {priorityList.length} Tasks
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {priorityList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-medium">All caught up!</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">No pending follow-ups for today.</p>
                </div>
              ) : (
                <motion.div
                  variants={VARIANTS.container}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-slate-100 dark:divide-slate-800"
                >
                  {priorityList.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={VARIANTS.row}
                      className="group flex flex-col sm:flex-row sm:items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                    >
                      {/* Priority Indicator */}
                      <div className="sm:w-16 flex-shrink-0">
                        {item.type === 'overdue' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800 uppercase tracking-wider">
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800 uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">{item.lead_name}</p>
                          <span className="sm:hidden text-xs text-slate-400">
                            {item.scheduled_date && !isNaN(new Date(item.scheduled_date))
                              ? format(new Date(item.scheduled_date), 'h:mm a')
                              : (item.scheduled_time || 'Today')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Phone size={12} /> Call</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Calendar size={12} />
                            {item.scheduled_date && !isNaN(new Date(item.scheduled_date))
                              ? format(new Date(item.scheduled_date), 'h:mm a')
                              : (item.scheduled_time || 'Today')}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => completeFollowUp(item.id)}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                        >
                          <CheckCircle size={12} /> Complete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* --- RIGHT: INSIGHTS & ACTIONS (1/3 width) --- */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div variants={VARIANTS.card} className="bg-card rounded-xl border border-master p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              {[
                { label: "Pipeline Views", href: "/leads", icon: <Activity size={16} />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { label: "Performance Reports", href: "/reports", icon: <TrendingUp size={16} />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
                { label: "CRM Settings", href: "/settings", icon: <MoreHorizontal size={16} />, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800" },
              ].map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 dark:text-slate-600 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Revenue Trend Chart (Recharts) */}
          <motion.div variants={VARIANTS.card} className="bg-card rounded-xl border border-master p-5 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue Trend</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$42.5k</div>
              </div>
              <div className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">+12.5%</div>
            </div>

            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Mon', value: 2400 },
                  { name: 'Tue', value: 1398 },
                  { name: 'Wed', value: 9800 },
                  { name: 'Thu', value: 3908 },
                  { name: 'Fri', value: 4800 },
                  { name: 'Sat', value: 3800 },
                  { name: 'Sun', value: 4300 },
                ]}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#a5b4fc' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function MetricCard({ label, value, trend, trendLabel, trendPositive, icon, color }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  };

  return (
    <motion.div
      variants={VARIANTS.card}
      whileHover={{ y: -4, transition: TRANSITIONS.fast }}
      className="bg-card rounded-xl border border-master p-5 shadow-sm hover:shadow-md transition-shadow cursor-default"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <span className={trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}>{trend}</span>
        <span className="text-slate-400 dark:text-slate-500">{trendLabel}</span>
      </div>
    </motion.div>
  );
}
