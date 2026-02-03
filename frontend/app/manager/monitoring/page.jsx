'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import PerformanceView from '../../../components/shared/PerformanceView';

export default function MonitoringPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMonitoring = async () => {
            try {
                setLoading(true);
                const res = await api.get('/manager/monitoring');
                const apiData = res.data;

                const monitoringSnapshot = {
                    header: {
                        title: 'Team Monitoring',
                        subtitle: `${apiData.team_summary?.online || 0} members active now`
                    },
                    leadsMetrics: [
                        { label: 'Team Members', value: apiData.team_summary?.total_members || 0, icon: 'Users', color: 'blue' },
                        { label: 'Active Tasks', value: apiData.team_members?.reduce((sum, m) => sum + (m.pending_tasks || 0), 0) || 0, icon: 'CheckCircle2', color: 'emerald' },
                        { label: 'Team High Risk', value: apiData.team_members?.filter(m => m.overdue_tasks > 3).length || 0, icon: 'TrendingUp', color: 'blue' }
                    ],
                    taskStatus: {
                        title: 'Team Task Status',
                        completed: apiData.team_members?.reduce((sum, m) => sum + (m.completed_tasks || 0), 0) || 0, // Fallback as backend might not have this yet
                        inProgress: apiData.team_members?.reduce((sum, m) => sum + (m.pending_tasks || 0), 0) || 0,
                        overdue: apiData.team_members?.reduce((sum, m) => sum + (m.overdue_tasks || 0), 0) || 0
                    },
                    activity: {
                        title: 'Live Roster',
                        section1: {
                            title: 'Online/Away',
                            items: apiData.team_members?.filter(m => m.status !== 'offline').map(m => ({ label: m.name, value: m.status })) || []
                        },
                        section2: {
                            title: 'Critical Attention',
                            items: apiData.team_members?.filter(m => m.overdue_tasks > 0).map(m => ({ label: m.name, value: `${m.overdue_tasks} overdue` })) || []
                        }
                    },
                    footer: { text: 'Real-time team activity monitor' }
                };

                setData(monitoringSnapshot);
            } catch (err) {
                console.error("Failed to fetch team monitoring", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMonitoring();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-slate-400">Syncing team signals...</div>;

    return <PerformanceView data={data} />;
}
