'use client';
import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    Target,
    TrendingUp,
    Calendar
} from 'lucide-react';
import { getPerformanceMetrics } from '../../../lib/adapters/performance-adapter';

export default function PerformancePage() {
    const [metrics, setMetrics] = useState({
        totalLeads: 0,
        converted: 0,
        conversionRate: 0,
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksOverdue: 0,
        thisWeek: { completed: 0, contacted: 0 },
        thisMonth: { resolved: 0, converted: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            setLoading(true);
            try {
                const data = await getPerformanceMetrics();
                setMetrics(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, []);

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100">

            {/* --- HEADER --- */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        My Performance
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Your personal work summary
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 space-y-8 pb-12">

                {/* --- SECTION 1: PERSONAL LEAD SUMMARY --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Leads */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Total Leads Handled
                        </span>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.totalLeads}</span>
                            <Target size={20} className="text-slate-300 dark:text-slate-600 mb-1" />
                        </div>
                    </div>

                    {/* Converted */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Leads Converted
                        </span>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.converted}</span>
                            <CheckCircle2 size={20} className="text-emerald-100 dark:text-emerald-900/40 mb-1" />
                        </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Conversion Rate
                        </span>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{metrics.conversionRate}%</span>
                            <TrendingUp size={20} className="text-blue-100 dark:text-blue-900/40 mb-1" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* --- SECTION 2: TASK COMPLETION SUMMARY --- */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-slate-400" />
                            Task Completion Status
                        </h3>

                        <div className="space-y-4">
                            {/* Completed */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed Tasks</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.tasksCompleted}</span>
                            </div>

                            {/* In Progress */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">In Progress</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.tasksInProgress}</span>
                            </div>

                            {/* Overdue */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overdue</span>
                                </div>
                                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{metrics.tasksOverdue}</span>
                            </div>
                        </div>
                    </div>

                    {/* --- SECTION 3: TIME-BASED BREAKDOWN --- */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            Activity Breakdown
                        </h3>

                        <div className="space-y-6">
                            {/* This Week */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">This Week</p>
                                <div className="space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Tasks Completed</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{metrics.thisWeek.completed}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">New Leads Contacted</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{metrics.thisWeek.contacted}</span>
                                    </div>
                                </div>
                            </div>

                            {/* This Month */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">This Month</p>
                                <div className="space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Total Tasks Resolved</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{metrics.thisMonth.resolved}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Leads Converted</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{metrics.thisMonth.converted}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-600">
                        Last updated: Just now • Data reflects your personal activity only
                    </p>
                </div>

            </div>
        </div>
    );
}
