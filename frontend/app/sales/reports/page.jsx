'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import ChartWrapper from '../../../components/shared/ChartWrapper';

import { motion } from 'framer-motion';
import { VARIANTS, TRANSITIONS } from '../../../lib/motion';
import {
  TrendingUp,
  Users,
  Target,
  Activity,
  Filter
} from 'lucide-react';

// Professional, "Trust" Palette
const COLORS = {
  primary: '#0f172a', // Slate 900
  secondary: '#64748b', // Slate 500
  accent1: '#3b82f6', // Blue 500
  accent2: '#10b981', // Emerald 500
  accent3: '#6366f1', // Indigo 500
  accent4: '#f59e0b', // Amber 500
  grid: '#e2e8f0' // Slate 200
};

const PIE_COLORS = [COLORS.accent1, COLORS.accent2, COLORS.accent3, COLORS.accent4, '#ef4444'];

// Custom Hook for CountUp Animation
function useCountUp(end, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = time - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutQuart
      const ease = 1 - Math.pow(1 - percentage, 4);

      setCount(Math.floor(end * ease));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

function MetricCard({ label, value, color, icon: Icon, suffix = '', prefix = '' }) {
  const animatedValue = useCountUp(value || 0);

  return (
    <motion.div
      variants={VARIANTS.card}
      whileHover={{ y: -4, transition: TRANSITIONS.fast }}
      className="bg-card rounded-xl border border-master p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {Icon && <Icon size={48} />}
      </div>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
        {Icon && <Icon size={14} />}
        {label}
      </p>
      <div className={`text-3xl font-black tracking-tight ${color} dark:text-white`}>
        {prefix}{animatedValue.toLocaleString()}{suffix}
      </div>
    </motion.div>
  );
}

export default function Reports({
  dashboardEndpoint = '/leads/dashboard',
  overviewEndpoint = null
}) {
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      const statsRes = await api.get(dashboardEndpoint);
      const raw = statsRes.data;
      // Normalize /leads/dashboard shape (metrics.*) to report shape (totalLeads, etc.)
      setStats(raw?.metrics ? {
        totalLeads: raw.metrics.total_leads,
        convertedLeads: raw.metrics.closed_leads,
        lostLeads: raw.metrics.lost_leads ?? 0,
        conversionRate: raw.metrics.conversion_rate,
        leadsByStatus: raw.leadsByStatus || [],
        leadsBySource: raw.leadsBySource || [],
      } : raw);
      if (overviewEndpoint) {
        try {
          const overviewRes = await api.get(overviewEndpoint, { params: { period } });
          setOverview(overviewRes.data);
        } catch {
          setOverview(null);
        }
      } else {
        setOverview(null);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setStats(null);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prepare chart data
  const leadsByStatusData = stats?.leadsByStatus?.map((item) => ({
    name: item.status,
    value: parseInt(item.count),
  })) || [];

  const leadsBySourceData = stats?.leadsBySource?.map((item) => ({
    name: item.source,
    value: parseInt(item.count),
  })) || [];

  const overviewData = overview?.leadsCreated?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: parseInt(item.count),
    conversions: overview.conversions?.find((c) => c.date === item.date)?.count || 0,
  })) || [];

  return (
    <motion.div
      variants={VARIANTS.page}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-page pb-20 font-sans text-primary"
    >

      {/* 1. Header Section */}
      <motion.div variants={VARIANTS.header} className="border-b border-subtle bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary tracking-tight leading-none">Reports & Analytics</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Data-driven insights</p>
            </div>
          </div>

          {/* Filters - Segmented Control */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-xs font-bold">
            {['week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md transition-all
                  ${period === p
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* 2. Overview Metrics (Trust via Numbers) */}
        <motion.section variants={VARIANTS.container} initial="hidden" animate="show" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Leads"
              value={stats?.totalLeads}
              color="text-slate-900"
              icon={Users}
            />
            <MetricCard
              label="Converted"
              value={stats?.convertedLeads}
              color="text-emerald-600"
              icon={Target}
            />
            <MetricCard
              label="Lost"
              value={stats?.lostLeads}
              color="text-rose-600"
              icon={Filter}
            />
            <MetricCard
              label="Conversion Rate"
              value={stats?.conversionRate}
              color="text-indigo-600"
              suffix="%"
              icon={TrendingUp}
            />
          </div>
        </motion.section>

        {/* 3. Primary Trends (The "Story") */}
        <motion.section
          variants={VARIANTS.card}
          className="mb-8 bg-card rounded-xl border border-master p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-primary">Growth Trajectory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lead volume vs. successful conversions.</p>
            </div>
            {/* Legend Replacement */}
            <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-slate-600 dark:text-slate-300">Total Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 dark:text-slate-300">Conversions</span>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ChartWrapper width="100%" height="100%">
              <AreaChart data={overviewData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.accent1} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.accent1} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.accent2} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={COLORS.accent2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={COLORS.grid} strokeDasharray="3 3" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                  labelStyle={{ color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke={COLORS.accent1}
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke={COLORS.accent2}
                  fillOpacity={1}
                  fill="url(#colorConversions)"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ChartWrapper>
          </div>
        </motion.section>

        {/* 4. Secondary Insights (Breakdowns) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Status Breakdown */}
          <motion.div
            variants={VARIANTS.card}
            className="bg-card rounded-xl border border-master p-6 shadow-sm h-[360px]"
          >
            <h3 className="text-sm font-bold text-primary mb-4">Pipeline Distribution</h3>
            <div className="w-full h-[280px]">
              <ChartWrapper width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsByStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadsByStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ChartWrapper>
            </div>
          </motion.div>

          {/* Source Breakdown */}
          <motion.div
            variants={VARIANTS.card}
            className="bg-card rounded-xl border border-master p-6 shadow-sm h-[360px]"
          >
            <h3 className="text-sm font-bold text-primary mb-4">Top Sources</h3>
            <div className="w-full h-[280px]">
              <ChartWrapper width="100%" height="100%">
                <BarChart data={leadsBySourceData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={COLORS.grid} strokeDasharray="3 3" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    width={80}
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar
                    dataKey="value"
                    fill={COLORS.accent3}
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    animationDuration={1500}
                    background={{ fill: '#f1f5f9', radius: [0, 4, 4, 0] }}
                  />
                </BarChart>
              </ChartWrapper>
            </div>
          </motion.div>

        </section>
      </div>
    </motion.div>
  );
}

