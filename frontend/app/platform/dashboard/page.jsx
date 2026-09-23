'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, AlertCircle, TrendingUp, Clock, ShieldCheck, ArrowUpRight } from 'lucide-react';

const PLATFORM_API = '/api/platform';

const KPI_ACCENT = {
    blue: 'var(--color-accent)',
    amber: 'var(--color-warning)',
    green: 'var(--color-success)',
    red: 'var(--color-error)',
};

const STAT_ICON = {
    blue: 'bg-accent-subtle text-accent',
    amber: 'bg-amber-500/15 text-warning',
    green: 'bg-emerald-500/15 text-success',
    red: 'bg-red-500/15 text-error',
};

export default function PlatformDashboardPage() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/metrics/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setMetrics(await response.json());
            } else {
                setError('Failed to load platform metrics. Please check your session.');
            }
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
            setError('Failed to load platform metrics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6">
                <p className="text-sm font-medium text-error text-center">{error}</p>
                <button type="button" onClick={fetchMetrics} className="btn-primary text-sm">
                    Retry
                </button>
            </div>
        );
    }

    const companiesTotal = metrics?.companies?.total || 0;
    const companiesActive = metrics?.companies?.active || 0;
    const companiesPending = metrics?.companies?.pending || 0;
    const companiesSuspended = metrics?.companies?.suspended || 0;
    const usersTotal = metrics?.users?.total || 0;
    const usersActive = metrics?.users?.active || 0;

    const stats = [
        {
            label: 'Total companies',
            value: companiesTotal,
            icon: Building2,
            color: 'blue',
            subtext: `${companiesActive} active`,
        },
        {
            label: 'Pending approvals',
            value: companiesPending,
            icon: Clock,
            color: 'amber',
            subtext: 'Awaiting review',
        },
        {
            label: 'Total users',
            value: usersTotal,
            icon: Users,
            color: 'green',
            subtext: `${usersActive} active`,
        },
        {
            label: 'Suspended',
            value: companiesSuspended,
            icon: AlertCircle,
            color: 'red',
            subtext: 'Companies',
        },
    ];

    const planNames = { 1: 'Starter', 2: 'Growth', 3: 'Enterprise' };
    const planRows = metrics?.plan_distribution || [];
    const planMax = Math.max(1, ...planRows.map((p) => p.count || 0));

    const healthRows = [
        {
            label: 'Active',
            value: companiesActive,
            tone: 'var(--color-success)',
            pct: companiesTotal ? (companiesActive / companiesTotal) * 100 : 0,
        },
        {
            label: 'Pending',
            value: companiesPending,
            tone: 'var(--color-warning)',
            pct: companiesTotal ? (companiesPending / companiesTotal) * 100 : 0,
        },
        {
            label: 'Suspended',
            value: companiesSuspended,
            tone: 'var(--color-error)',
            pct: companiesTotal ? (companiesSuspended / companiesTotal) * 100 : 0,
        },
        {
            label: 'Users across tenants',
            value: usersTotal,
            tone: 'var(--color-accent)',
            pct: usersTotal ? Math.min(100, (usersActive / Math.max(usersTotal, 1)) * 100) : 0,
        },
    ];

    const volume = [
        { label: 'Leads', value: metrics?.business_metrics?.leads },
        { label: 'Clients', value: metrics?.business_metrics?.clients },
        { label: 'Tasks', value: metrics?.business_metrics?.tasks },
        { label: 'Invoices', value: metrics?.business_metrics?.invoices },
    ];

    return (
        <div className="p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1400px]">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-1.5">
                        Overview
                    </p>
                    <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                        Analytics
                    </h1>
                    <p className="text-[15px] text-muted mt-1">
                        System-wide health across every tenant
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface text-[12px] font-medium text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Live
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            fetchMetrics();
                        }}
                        className="px-2.5 py-1 rounded-full border border-border bg-surface text-[12px] font-medium text-secondary hover:text-primary hover:border-border-strong transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="platform-card platform-kpi"
                        style={{ '--kpi-accent': KPI_ACCENT[stat.color] }}
                    >
                        <div className="flex items-start justify-between mb-3 pl-1">
                            <p className="text-[14px] font-medium text-secondary">{stat.label}</p>
                            <div className={`p-1.5 rounded-lg ${STAT_ICON[stat.color]}`}>
                                <stat.icon size={17} strokeWidth={1.75} />
                            </div>
                        </div>
                        <p className="text-3xl font-semibold text-primary tabular-nums tracking-tight pl-1">
                            {stat.value.toLocaleString()}
                        </p>
                        <p className="text-[13px] text-muted mt-1.5 pl-1">{stat.subtext}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="platform-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-primary">Company health</h2>
                        <span className="text-[12px] text-muted tabular-nums">
                            {companiesTotal} total
                        </span>
                    </div>
                    <div className="space-y-3.5">
                        {healthRows.map((row) => (
                            <div key={row.label}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[14px] text-secondary">{row.label}</span>
                                    <span className="text-[14px] font-semibold text-primary tabular-nums">
                                        {row.value}
                                    </span>
                                </div>
                                <div className="platform-meter">
                                    <span
                                        style={{
                                            width: `${Math.max(row.pct, row.value > 0 ? 4 : 0)}%`,
                                            background: row.tone,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="platform-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-primary">Plan distribution</h2>
                        <Link
                            href="/platform/plans"
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover"
                        >
                            View plans
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>
                    <div className="space-y-3.5">
                        {planRows.map((plan, index) => {
                            const count = plan.count || 0;
                            const pct = (count / planMax) * 100;
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[14px] text-secondary">
                                            {planNames[plan.plan_id] || `Plan ${plan.plan_id}`}
                                        </span>
                                        <span className="text-[13px] font-medium text-primary tabular-nums">
                                            {count} {count === 1 ? 'company' : 'companies'}
                                        </span>
                                    </div>
                                    <div className="platform-meter">
                                        <span style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {planRows.length === 0 && (
                            <p className="text-[14px] text-muted py-2">No plan data yet</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="platform-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-primary">Business volume</h2>
                    <span className="text-[12px] text-muted">All tenants</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {volume.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl bg-surface-elevated border border-border-subtle p-4"
                        >
                            <p className="text-[13px] font-medium text-muted">{item.label}</p>
                            <p className="text-2xl font-semibold text-primary tabular-nums mt-2 tracking-tight">
                                {item.value ?? '—'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="platform-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/15 text-success">
                            <ShieldCheck size={16} />
                        </div>
                        <span className="text-[14px] font-semibold text-primary">Approval queue</span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tabular-nums tracking-tight">
                        {companiesPending}
                    </p>
                    <p className="text-[13px] text-muted mt-1.5">Companies awaiting review</p>
                </div>
                <div className="platform-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-accent-subtle text-accent">
                            <Building2 size={16} />
                        </div>
                        <span className="text-[14px] font-semibold text-primary">Organizations</span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tabular-nums tracking-tight">
                        {companiesTotal}
                    </p>
                    <p className="text-[13px] text-muted mt-1.5">Registered companies</p>
                </div>
                <div className="platform-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-sky-500/15 text-info">
                            <Users size={16} />
                        </div>
                        <span className="text-[14px] font-semibold text-primary">Active footprint</span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tabular-nums tracking-tight">
                        {usersActive}
                    </p>
                    <p className="text-[13px] text-muted mt-1.5">Active users across tenants</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href="/platform/requests" className="platform-action">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-warning shrink-0">
                        <Clock size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-primary">Pending signups</p>
                        <p className="text-[13px] text-muted">{companiesPending} pending</p>
                    </div>
                    <ArrowUpRight size={16} className="text-muted shrink-0" />
                </Link>
                <Link href="/platform/companies" className="platform-action">
                    <div className="p-2 rounded-lg bg-accent-subtle text-accent shrink-0">
                        <Building2 size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-primary">All companies</p>
                        <p className="text-[13px] text-muted">Filter by status</p>
                    </div>
                    <ArrowUpRight size={16} className="text-muted shrink-0" />
                </Link>
                <Link href="/platform/plans" className="platform-action">
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-success shrink-0">
                        <TrendingUp size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-primary">Plans</p>
                        <p className="text-[13px] text-muted">Subscription catalog</p>
                    </div>
                    <ArrowUpRight size={16} className="text-muted shrink-0" />
                </Link>
            </div>
        </div>
    );
}
