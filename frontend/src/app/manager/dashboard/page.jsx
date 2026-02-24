'use client';

/**
 * MANAGER DASHBOARD - Team Supervision View
 * 
 * Purpose: Overview of team performance and urgent tasks.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getManagerDashboardMetrics, getTeamPriorityTasks } from '../../../lib/adapters/manager-adapter';
import {
    Users,
    CheckCircle,
    Percent,
    TrendingUp,
    ShieldAlert,
    Clock,
    ArrowRight,
    User
} from 'lucide-react';

export default function ManagerDashboard() {
    const [metrics, setMetrics] = useState({
        totalTeamLeads: 0,
        teamClosedLeads: 0,
        teamConversionRate: 0,
        activeCampaigns: 0
    });
    const [priorityTasks, setPriorityTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [metricsData, tasksData] = await Promise.all([
                getManagerDashboardMetrics(),
                getTeamPriorityTasks()
            ]);

            setMetrics(metricsData);
            setPriorityTasks(tasksData);
        } catch (error) {
            console.warn('Manager Dashboard fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
                <div className="text-sm text-slate-500 font-medium animate-pulse">Loading manager dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">

            {/* Top Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Manager Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Team overview and critical actions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/manager/reports"
                            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                        >
                            View Reports
                        </Link>
                        <Link
                            href="/manager/team"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                            <Users size={16} />
                            Manage Team
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 space-y-8">

                {/* 1. key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CompactMetric
                        label="Team Leads"
                        sub="Active Pipeline"
                        value={metrics.totalTeamLeads}
                        icon={Users}
                    />
                    <CompactMetric
                        label="Team Closed"
                        sub="Converted this month"
                        value={metrics.teamClosedLeads}
                        icon={CheckCircle}
                        color="text-emerald-600"
                    />
                    <CompactMetric
                        label="Win Rate"
                        sub="Team Average"
                        value={`${metrics.teamConversionRate}%`}
                        icon={Percent}
                        color="text-blue-600"
                    />
                    <CompactMetric
                        label="Campaigns"
                        sub="Active Marketing"
                        value={metrics.activeCampaigns}
                        icon={TrendingUp}
                        color="text-purple-600"
                    />
                </div>

                {/* 2. Layout: Priority Tasks & Quick Team Status (Future) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Priority Tasks - Wide Column */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-red-50/30 dark:bg-red-900/10">
                            <ShieldAlert className="text-red-600 dark:text-red-400" size={20} />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Attention Needed</h2>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {priorityTasks.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="text-emerald-500" size={24} />
                                    </div>
                                    <h3 className="text-slate-800 dark:text-white font-medium">No critical issues!</h3>
                                    <p className="text-slate-500 text-sm mt-1">Team is on track.</p>
                                </div>
                            ) : (
                                priorityTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`
                            px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                            ${task.statusReason === 'OVERDUE'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                        `}>
                                                    {task.statusReason === 'OVERDUE' ? 'Overdue' : 'Due Today'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                    <User size={10} /> {task.assignee}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                {task.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-6 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Due Date</p>
                                                <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {format(parseISO(task.dueDate), 'MMM d')}
                                                </div>
                                            </div>
                                            {/* Action dummy button */}
                                            <button className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Simple Team Activity Placeholder */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Active Reps</span>
                                <span className="font-bold text-slate-800 dark:text-white">4/5</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Pending Approvals</span>
                                <span className="font-bold text-amber-600">3</span>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                                <Link href="/manager/team" className="text-sm font-medium text-blue-600 hover:underline">View Team Activity &rarr;</Link>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

function CompactMetric({ label, value, sub, icon: Icon, color = "text-slate-800 dark:text-white" }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md text-slate-400 dark:text-slate-500">
                <Icon size={20} />
            </div>
        </div>
    )
}
