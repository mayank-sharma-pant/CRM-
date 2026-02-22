'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const PLATFORM_API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/platform';

export default function PlatformDashboardPage() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/metrics/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const stats = [
        {
            label: 'Total Companies',
            value: metrics?.companies?.total || 0,
            icon: Building2,
            color: 'blue',
            subtext: `${metrics?.companies?.active || 0} active`
        },
        {
            label: 'Pending Approvals',
            value: metrics?.companies?.pending || 0,
            icon: Clock,
            color: 'amber',
            subtext: 'Awaiting review'
        },
        {
            label: 'Total Users',
            value: metrics?.users?.total || 0,
            icon: Users,
            color: 'green',
            subtext: `${metrics?.users?.active || 0} active`
        },
        {
            label: 'Suspended',
            value: metrics?.companies?.suspended || 0,
            icon: AlertCircle,
            color: 'red',
            subtext: 'Companies'
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100',
            amber: 'bg-amber-50 text-amber-600 border-amber-100',
            green: 'bg-green-50 text-green-600 border-green-100',
            red: 'bg-red-50 text-red-600 border-red-100'
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Platform Dashboard</h1>
                <p className="text-slate-600 mt-1">System-wide overview and metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-lg border ${getColorClasses(stat.color)}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Business Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Business Metrics</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total Leads</span>
                            <span className="text-xl font-bold text-slate-900">
                                {metrics?.business_metrics?.leads || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total Clients</span>
                            <span className="text-xl font-bold text-slate-900">
                                {metrics?.business_metrics?.clients || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total Tasks</span>
                            <span className="text-xl font-bold text-slate-900">
                                {metrics?.business_metrics?.tasks || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total Invoices</span>
                            <span className="text-xl font-bold text-slate-900">
                                {metrics?.business_metrics?.invoices || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Plan Distribution</h2>
                    <div className="space-y-3">
                        {metrics?.plan_distribution?.map((plan, index) => {
                            const planNames = { 1: 'Starter', 2: 'Growth', 3: 'Enterprise' };
                            return (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-slate-600">{planNames[plan.plan_id] || `Plan ${plan.plan_id}`}</span>
                                    <span className="text-lg font-bold text-slate-900">{plan.count} companies</span>
                                </div>
                            );
                        })}
                        {(!metrics?.plan_distribution || metrics.plan_distribution.length === 0) && (
                            <p className="text-slate-400 text-sm italic">No active companies yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href="/platform/requests"
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Clock className="text-amber-600" size={24} />
                        <div>
                            <p className="font-semibold text-slate-900">Review Requests</p>
                            <p className="text-sm text-slate-600">{metrics?.companies?.pending || 0} pending</p>
                        </div>
                    </a>
                    <a
                        href="/platform/companies"
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Building2 className="text-blue-600" size={24} />
                        <div>
                            <p className="font-semibold text-slate-900">Manage Companies</p>
                            <p className="text-sm text-slate-600">View all companies</p>
                        </div>
                    </a>
                    <a
                        href="/platform/plans"
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <TrendingUp className="text-green-600" size={24} />
                        <div>
                            <p className="font-semibold text-slate-900">Manage Plans</p>
                            <p className="text-sm text-slate-600">Configure pricing</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
