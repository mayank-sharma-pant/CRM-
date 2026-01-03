'use client';

/**
 * DASHBOARD - Sales Executive Overview
 * 
 * Purpose: Motivating, vibrant command center for daily performance
 * Style: Modern CRM (Salesforce/HubSpot inspired), light, clean, calm
 * 
 * Sections:
 * 1. Metric Cards (Total, Closed, Conv Rate, Active)
 * 2. Priority Focus (Overdue/Today items)
 * 3. Activity Trend (Simple bar chart)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import {
  Plus,
  Users,
  CheckCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    closedLeads: 0,
    conversionRate: 0,
    activePipeline: 0
  });
  const [priorityItems, setPriorityItems] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Parallel data fetching for performance
      const [leadsRes, overdueRes, todayRes] = await Promise.all([
        api.get('/leads'),
        api.get('/follow-ups/overdue'),
        api.get('/follow-ups/today')
      ]);

      const leads = leadsRes.data || [];
      const overdue = overdueRes.data || [];
      const today = todayRes.data || [];

      // Calculate Metrics
      const total = leads.length;
      const closed = leads.filter(l => l.status === 'Converted').length;
      const active = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
      const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;

      setMetrics({
        totalLeads: total,
        closedLeads: closed,
        conversionRate: convRate,
        activePipeline: active
      });

      // Prepare Priority Items (Overdue + Today)
      const combinedPriority = [
        ...overdue.map(i => ({ ...i, type: 'Overdue', date: i.due_date })),
        ...today.map(i => ({ ...i, type: 'Due Today', date: i.due_date }))
      ].slice(0, 5); // Limit to top 5

      setPriorityItems(combinedPriority);

      // Mock Activity Data (Last 7 days)
      // In a real app, this would come from an aggregation endpoint
      const mockChartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        return {
          name: format(d, 'EEE'), // Mon, Tue...
          activities: Math.floor(Math.random() * 8) + 2 // Random 2-10
        };
      });
      setActivityData(mockChartData);

    } catch (error) {
      console.error('Dashboard fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
        <div className="text-sm text-slate-500 font-medium animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Overview of your daily activity and performance
            </p>
          </div>
          <Link
            href="/leads?action=new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-200 dark:shadow-none hover:shadow-lg"
          >
            <Plus size={16} />
            Add New Lead
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 space-y-8">

        {/* 1. Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Leads"
            value={metrics.totalLeads}
            icon={Users}
            color="blue"
            sub="All time"
          />
          <MetricCard
            title="Active Pipeline"
            value={metrics.activePipeline}
            icon={Activity}
            color="indigo"
            sub="In progress"
          />
          <MetricCard
            title="Closed Leads"
            value={metrics.closedLeads}
            icon={CheckCircle}
            color="green"
            sub="Success"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={TrendingUp}
            color="teal"
            sub="Performance"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 2. Priority Focus (2/3 width) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Priority Focus</h2>
              </div>
              <Link href="/tasks" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all tasks
              </Link>
            </div>

            <div className="flex-1 min-h-[300px]">
              {priorityItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="text-green-500" size={24} />
                  </div>
                  <p className="text-slate-800 font-medium">All caught up!</p>
                  <p className="text-sm text-slate-500">No overdue items or tasks for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {priorityItems.map((item, idx) => (
                    <Link
                      key={idx}
                      href={`/leads/${item.lead_id || item.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${item.type === 'Overdue' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {item.lead_name || item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.type} • {item.date ? format(new Date(item.date), 'MMM d') : 'No date'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))}
                  <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing top {priorityItems.length} items
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Activity Trend Chart (1/3 width) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Activity Trend</h2>
            </div>
            <div className="p-6 flex-1 flex items-center justify-center">
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      hide
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar
                      dataKey="activities"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, sub }) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{value}</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">{sub}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
