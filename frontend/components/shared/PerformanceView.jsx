'use client';

import {
    CheckCircle2,
    Target,
    TrendingUp,
    Calendar,
    Users
} from 'lucide-react';

export default function PerformanceView({ data }) {
    if (!data) return null;

    const { header, leadsMetrics, taskStatus, activity, footer } = data;

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {header?.title || 'Performance'}
                    </h1>
                    <p className="page-subtitle">
                        {header?.subtitle || 'Metrics overview'}
                    </p>
                </div>
            </div>

            <div className="page-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {leadsMetrics?.map((metric, index) => {
                        const Icon = metric.icon === 'Target' ? Target :
                            metric.icon === 'CheckCircle2' ? CheckCircle2 :
                                metric.icon === 'TrendingUp' ? TrendingUp :
                                    metric.icon === 'Users' ? Users : Target;

                        const valueColorClass = metric.color === 'emerald' ? 'text-success' :
                            metric.color === 'blue' ? 'text-accent' :
                                'text-primary';

                        return (
                            <div key={index} className="panel p-4 flex flex-col justify-between min-h-[7.5rem]">
                                <span className="text-[12px] font-medium text-muted">
                                    {metric.label}
                                </span>
                                <div className="flex items-end justify-between mt-2">
                                    <span className={`text-2xl font-semibold tabular-nums ${valueColorClass}`}>{metric.value}</span>
                                    <Icon size={18} className="text-muted mb-0.5" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="panel p-4">
                        <h3 className="text-[13px] font-medium text-secondary mb-4 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-muted" />
                            {taskStatus?.title || 'Task Completion Status'}
                        </h3>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                    <span className="text-sm text-secondary">Completed</span>
                                </div>
                                <span className="text-sm font-semibold text-primary tabular-nums">{taskStatus?.completed}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-accent" />
                                    <span className="text-sm text-secondary">In Progress</span>
                                </div>
                                <span className="text-sm font-semibold text-primary tabular-nums">{taskStatus?.inProgress}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-error" />
                                    <span className="text-sm text-secondary">Overdue</span>
                                </div>
                                <span className="text-sm font-semibold text-error tabular-nums">{taskStatus?.overdue}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel p-4">
                        <h3 className="text-[13px] font-medium text-secondary mb-4 flex items-center gap-2">
                            <Calendar size={16} className="text-muted" />
                            {activity?.title || 'Activity Breakdown'}
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">
                                    {activity?.section1?.title || 'Recent'}
                                </p>
                                <div className="space-y-2 pl-3 border-l-2 border-border">
                                    {activity?.section1?.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-secondary">{item.label}</span>
                                            <span className="font-medium text-primary tabular-nums">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">
                                    {activity?.section2?.title || 'Historical'}
                                </p>
                                <div className="space-y-2 pl-3 border-l-2 border-border">
                                    {activity?.section2?.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-secondary">{item.label}</span>
                                            <span className="font-medium text-primary tabular-nums">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[12px] text-muted pt-2 border-t border-border">
                    {footer?.text || 'Data reflects current snapshot'}
                </p>
            </div>
        </div>
    );
}
