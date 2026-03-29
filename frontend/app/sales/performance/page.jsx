'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import PerformanceView from '../../../components/shared/PerformanceView';

export default function PerformancePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                setLoading(true);
                const res = await api.get('/leads/dashboard');
                const apiData = res.data;

                const performanceSnapshot = {
                    header: {
                        title: 'My Performance',
                        subtitle: 'Real-time sales execution metrics'
                    },
                    leadsMetrics: [
                        { label: 'Total Leads', value: apiData.metrics.total_leads, icon: 'Users', color: 'blue' },
                        { label: 'Conversion Rate', value: `${apiData.metrics.conversion_rate}%`, icon: 'Target', color: 'emerald' },
                        { label: 'Revenue Sourced', value: `₹${apiData.metrics.my_revenue.toLocaleString()}`, icon: 'TrendingUp', color: 'blue' }
                    ],
                    taskStatus: {
                        title: 'Task Execution',
                        completed: apiData.task_metrics.completed,
                        inProgress: apiData.task_metrics.in_progress,
                        overdue: apiData.task_metrics.overdue
                    },
                    activity: {
                        title: 'Recent Activity',
                        section1: {
                            title: 'This Week',
                            items: [
                                { label: 'New Leads', value: apiData.activity.new_leads_this_week },
                                { label: 'Tasks Done', value: apiData.activity.tasks_done_this_week },
                                { label: 'Orders Made', value: apiData.metrics.my_orders }
                            ]
                        },
                        section2: {
                            title: 'Pipeline Health',
                            items: [
                                { label: 'Stalled Leads (14d+)', value: apiData.metrics.stalled_leads }
                            ]
                        }
                    },
                    footer: { text: `Snapshot as of ${new Date().toLocaleDateString()}` }
                };

                setData(performanceSnapshot);
            } catch (err) {
                console.error("Failed to fetch performance data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-slate-400">Loading performance signals...</div>;

    return <PerformanceView data={data} />;
}
