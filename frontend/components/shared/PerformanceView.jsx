'use client';

import {
    CheckCircle2,
    AlertCircle,
    Clock,
    Target,
    TrendingUp,
    Calendar,
    Users
} from 'lucide-react';

export default function PerformanceView({ data }) {
    if (!data) return null;

    const { header, leadsMetrics, taskStatus, activity, footer } = data;

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100">

            {/* --- HEADER --- */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        {header?.title || 'Performance'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {header?.subtitle || 'Metrics overview'}
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 space-y-8 pb-12">

                {/* --- SECTION 1: METRICS GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {leadsMetrics?.map((metric, index) => {
                        const Icon = metric.icon === 'Target' ? Target :
                            metric.icon === 'CheckCircle2' ? CheckCircle2 :
                                metric.icon === 'TrendingUp' ? TrendingUp :
                                    metric.icon === 'Users' ? Users : Target;

                        // Dynamic color classes based on the 'color' prop
                        const valueColorClass = metric.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                            metric.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                'text-slate-900 dark:text-white';

                        const iconColorClass = metric.color === 'emerald' ? 'text-emerald-100 dark:text-emerald-900/40' :
                            metric.color === 'blue' ? 'text-blue-100 dark:text-blue-900/40' :
                                'text-slate-300 dark:text-slate-600';

                        return (
                            <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    {metric.label}
                                </span>
                                <div className="flex items-end justify-between">
                                    <span className={`text-3xl font-bold ${valueColorClass}`}>{metric.value}</span>
                                    <Icon size={20} className={`${iconColorClass} mb-1`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* --- SECTION 2: TASK COMPLETION SUMMARY --- */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-slate-400" />
                            {taskStatus?.title || 'Task Completion Status'}
                        </h3>

                        <div className="space-y-4">
                            {/* Completed */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{taskStatus?.completed}</span>
                            </div>

                            {/* In Progress */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">In Progress</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{taskStatus?.inProgress}</span>
                            </div>

                            {/* Overdue */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overdue</span>
                                </div>
                                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{taskStatus?.overdue}</span>
                            </div>
                        </div>
                    </div>

                    {/* --- SECTION 3: TIME-BASED BREAKDOWN --- */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            {activity?.title || 'Activity Breakdown'}
                        </h3>

                        <div className="space-y-6">
                            {/* Section 1 (e.g. This Week) */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    {activity?.section1?.title || 'Recent'}
                                </p>
                                <div className="space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                                    {activity?.section1?.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2 (e.g. This Month) */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    {activity?.section2?.title || 'Historical'}
                                </p>
                                <div className="space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                                    {activity?.section2?.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-600">
                        {footer?.text || 'Data reflects current snapshot'}
                    </p>
                </div>

            </div>
        </div>
    );
}
