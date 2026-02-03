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
                // Building a basic performance snapshot from active entities
                const [leadsRes, tasksRes] = await Promise.all([
                    api.get('/leads'),
                    api.get('/tasks/list')
                ]);

                const leads = leadsRes.data.leads || [];
                const tasks = tasksRes.data || [];

                const performanceSnapshot = {
                    header: {
                        title: 'My Performance',
                        subtitle: 'Real-time sales execution metrics'
                    },
                    leadsMetrics: [
                        { label: 'Total Leads', value: leads.length, icon: 'Users', color: 'blue' },
                        { label: 'Conversion Rate', value: `${Math.round((leads.filter(l => l.status === 'Converted').length / Math.max(leads.length, 1)) * 100)}%`, icon: 'Target', color: 'emerald' },
                        { label: 'Active Pipeline', value: leads.filter(l => !['Converted', 'Lost'].includes(l.status)).length, icon: 'TrendingUp', color: 'blue' }
                    ],
                    taskStatus: {
                        title: 'Task Execution',
                        completed: tasks.filter(t => t.status === 'Completed').length,
                        inProgress: tasks.filter(t => t.status === 'Pending').length,
                        overdue: tasks.filter(t => t.status === 'Overdue').length
                    },
                    activity: {
                        title: 'Recent Activity',
                        section1: {
                            title: 'This Week',
                            items: [
                                { label: 'New Leads', value: leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length },
                                { label: 'Tasks Done', value: tasks.filter(t => t.status === 'Completed').length }
                            ]
                        },
                        section2: {
                            title: 'Pipeline Health',
                            items: [
                                { label: 'Stalled Leads', value: leads.filter(l => l.status === 'Contacted').length }
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
