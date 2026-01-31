'use client';

/**
 * TEAM LEAD DASHBOARD
 * 
 * Purpose: Quick operational view of team health.
 * Scope: Strict Team Scope (API Driven).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import {
    Users,
    CheckCircle,
    Clock,
    AlertTriangle,
    TrendingUp
} from 'lucide-react';

export default function TeamLeadDashboard() {
    const [metrics, setMetrics] = useState({
        totalLeads: 0,
        activeLeads: 0,
        convertedLeads: 0,
        pendingTasks: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            // Using Manager dashboard endpoint as it returns team-scoped data suitable for Team Lead too
            // Ideally backend would have /team-lead/dashboard but logic is identical for this MVP
            const response = await api.get('/manager/dashboard');
            const data = response.data;

            setMetrics({
                totalLeads: data.metrics.total_team_leads || 0,
                // calculating active roughly
                activeLeads: (data.metrics.total_team_leads || 0) - (data.metrics.closed_deals || 0),
                convertedLeads: data.metrics.closed_deals || 0,
                pendingTasks: data.priority_tasks?.length || 0 // Proxy using length of priority tasks
            });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)]">
                <div className="animate-pulse text-slate-400">Loading team overview...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Team Lead Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Operational overview of your team's performance
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 space-y-8">

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <DashboardCard
                        label="Total Leads"
                        value={metrics.totalLeads}
                        icon={Users}
                        color="text-blue-600"
                        bg="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <DashboardCard
                        label="Active Pipeline"
                        value={metrics.activeLeads}
                        icon={TrendingUp}
                        color="text-indigo-600"
                        bg="bg-indigo-50 dark:bg-indigo-900/20"
                    />
                    <DashboardCard
                        label="Converted"
                        value={metrics.convertedLeads}
                        icon={CheckCircle}
                        color="text-emerald-600"
                        bg="bg-emerald-50 dark:bg-emerald-900/20"
                    />
                    <DashboardCard
                        label="Pending Tasks"
                        value={metrics.pendingTasks}
                        icon={Clock}
                        color="text-amber-600"
                        bg="bg-amber-50 dark:bg-amber-900/20"
                    />
                </div>

                {/* Quick Actions / Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Navigation</h3>
                        <div className="space-y-3">
                            <Link href="/team-lead/leads" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View Team Leads</span>
                                <Users size={16} className="text-slate-400" />
                            </Link>
                            <Link href="/team-lead/tasks" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Team Tasks</span>
                                <CheckCircle size={16} className="text-slate-400" />
                            </Link>
                            <Link href="/ledgers" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Financial Ledgers</span>
                                <TrendingUp size={16} className="text-slate-400" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full mb-3">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Attention Required</h3>
                        <p className="text-sm text-slate-500 mb-4">You have {metrics.pendingTasks} urgent items to review.</p>
                        <Link href="/team-lead/tasks" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
                            Review Actions
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({ label, value, icon: Icon, color, bg }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                <div className={`p-2 rounded-lg ${bg} ${color}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{value}</div>
        </div>
    );
}
