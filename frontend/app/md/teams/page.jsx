'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Users, TrendingUp, Target, DollarSign, ChevronRight,
    Loader2, Briefcase, AlertTriangle, Activity, CheckCircle,
} from 'lucide-react';

function KPICard({ label, value, icon: Icon, suffix = '', prefix = '', subtitle }) {
    return (
        <div className="panel p-3">
            <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-accent" />
                </div>
                <div className="min-w-0">
                    <div className="text-xl font-semibold tracking-tight text-primary tabular-nums leading-tight">
                        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                    </div>
                    <p className="text-[12px] text-muted mt-0.5">{label}</p>
                    {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}

function BreakdownBar({ label, value, total, barClass }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-secondary w-28 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[12px] font-semibold text-primary w-8 text-right tabular-nums">{value}</span>
            <span className="text-[11px] text-muted w-10 text-right tabular-nums">{pct}%</span>
        </div>
    );
}

export default function MDTeamsPage() {
    const router = useRouter();
    const [teamsData, setTeamsData] = useState(null);
    const [salesData, setSalesData] = useState(null);
    const [monitoringData, setMonitoringData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [teamsRes, salesRes, monRes] = await Promise.allSettled([
                    api.get('/md/teams'),
                    api.get('/md/sales'),
                    api.get('/md/monitoring'),
                ]);
                if (teamsRes.status === 'fulfilled') setTeamsData(teamsRes.value.data);
                if (salesRes.status === 'fulfilled') setSalesData(salesRes.value.data);
                if (monRes.status === 'fulfilled') setMonitoringData(monRes.value.data);
            } catch (err) {
                console.error('Failed to fetch MD teams data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-page">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    <span className="text-[13px] text-muted">Loading teams…</span>
                </div>
            </div>
        );
    }

    const teams = teamsData?.teams || [];
    const totalMembers = teams.reduce((s, t) => s + t.member_count, 0);
    const totalLeads = teams.reduce((s, t) => s + t.total_leads, 0);
    const totalConverted = teams.reduce((s, t) => s + (t.converted_leads || 0), 0);
    const totalRevenue = teams.reduce((s, t) => s + t.revenue, 0);
    const totalOrders = teams.reduce((s, t) => s + (t.order_count || 0), 0);
    const overallWinRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

    const salesSummary = salesData?.summary || {};
    const alerts = monitoringData?.alerts || [];
    const highSeverity = alerts.filter((a) => a?.severity === 'High').length;

    const leadsSorted = [...teams].sort((a, b) => b.total_leads - a.total_leads);
    const revenueSorted = [...teams].sort((a, b) => b.revenue - a.revenue);

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Teams</h1>
                    <p className="page-subtitle">
                        {teams.length} team{teams.length !== 1 ? 's' : ''} · {totalMembers} members
                    </p>
                </div>
            </div>

            <div className="page-body space-y-5">
                <section className="space-y-3">
                    <h2 className="text-[13px] font-medium text-secondary">Company performance</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <KPICard label="Total leads" value={totalLeads} icon={Target} />
                        <KPICard label="Converted" value={totalConverted} icon={CheckCircle} />
                        <KPICard label="Win rate" value={overallWinRate} icon={TrendingUp} suffix="%" />
                        <KPICard label="Revenue" value={Math.round(totalRevenue)} icon={DollarSign} prefix="₹" />
                        <KPICard label="Orders" value={totalOrders} icon={Briefcase} />
                        <KPICard
                            label="Alerts"
                            value={alerts.length}
                            icon={AlertTriangle}
                            subtitle={highSeverity > 0 ? `${highSeverity} high severity` : 'All clear'}
                        />
                    </div>
                </section>

                {salesSummary.total_deals != null && (
                    <section className="space-y-3">
                        <h2 className="text-[13px] font-medium text-secondary">Deals overview</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KPICard label="Total deals" value={salesSummary.total_deals || 0} icon={Briefcase} />
                            <KPICard label="Active" value={salesSummary.active || 0} icon={Activity} />
                            <KPICard label="Won" value={salesSummary.won || 0} icon={CheckCircle} />
                            <KPICard label="Deal win rate" value={salesSummary.win_rate || 0} icon={TrendingUp} suffix="%" />
                        </div>
                    </section>
                )}

                {teams.length > 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="panel p-4">
                            <h3 className="text-[13px] font-medium text-secondary mb-4">Leads by team</h3>
                            <div className="space-y-3">
                                {leadsSorted.map((t) => (
                                    <BreakdownBar key={t.id} label={t.name} value={t.total_leads} total={totalLeads || 1} barClass="bg-accent" />
                                ))}
                            </div>
                        </div>
                        <div className="panel p-4">
                            <h3 className="text-[13px] font-medium text-secondary mb-4">Revenue by team</h3>
                            <div className="space-y-3">
                                {revenueSorted.map((t) => (
                                    <BreakdownBar
                                        key={t.id}
                                        label={t.name}
                                        value={Math.round(t.revenue)}
                                        total={Math.round(totalRevenue) || 1}
                                        barClass="bg-success"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {alerts.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-[13px] font-medium text-secondary flex items-center gap-2">
                            <AlertTriangle size={14} className="text-warning" />
                            Active alerts
                        </h2>
                        <div className="panel divide-y divide-border overflow-hidden">
                            {alerts.slice(0, 10).map((alert, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                alert.severity === 'High'
                                                    ? 'bg-error'
                                                    : alert.severity === 'Medium'
                                                      ? 'bg-warning'
                                                      : 'bg-accent'
                                            }`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm text-primary truncate">{alert.title || alert.message || 'Alert'}</p>
                                            {alert.description && (
                                                <p className="text-[11px] text-muted mt-0.5">{alert.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="badge badge-neutral shrink-0">{alert.severity || 'Info'}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="text-[13px] font-medium text-secondary">Team details</h2>

                    {teams.length === 0 ? (
                        <div className="panel p-12 text-center">
                            <p className="text-[13px] text-muted">No teams configured yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {teams.map((team) => (
                                <div key={team.id} className="panel overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-elevated transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                                                <Users size={16} className="text-accent" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-primary">{team.name}</h3>
                                                <p className="text-[12px] text-muted mt-0.5">
                                                    Manager: {team.manager} · {team.member_count} member
                                                    {team.member_count !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5">
                                            <div className="text-right hidden md:block">
                                                <div className="text-[11px] text-muted">Leads</div>
                                                <div className="text-sm font-semibold text-primary tabular-nums">{team.total_leads}</div>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <div className="text-[11px] text-muted">Win %</div>
                                                <div className="text-sm font-semibold text-primary tabular-nums">{team.conversion_rate}%</div>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <div className="text-[11px] text-muted">Revenue</div>
                                                <div className="text-sm font-semibold text-primary tabular-nums">
                                                    ₹{team.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>
                                            <div className="text-right hidden lg:block">
                                                <div className="text-[11px] text-muted">Orders</div>
                                                <div className="text-sm font-semibold text-primary tabular-nums">{team.order_count}</div>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className={`text-muted transition-transform ${expandedTeam === team.id ? 'rotate-90' : ''}`}
                                            />
                                        </div>
                                    </button>

                                    {expandedTeam === team.id && (
                                        <div className="border-t border-border">
                                            <div className="px-4 py-2 bg-surface-elevated/50 text-[11px] font-medium text-muted">
                                                Members
                                            </div>
                                            <div className="divide-y divide-border">
                                                {team.members.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => router.push(`/md/employee-lookup/${member.id}`)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') router.push(`/md/employee-lookup/${member.id}`);
                                                        }}
                                                        className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[11px] font-semibold text-secondary">
                                                                {member.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-primary">{member.full_name}</p>
                                                                <p className="text-[12px] text-muted">{member.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="badge badge-neutral">{member.role}</span>
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    member.status === 'active' ? 'bg-success' : 'bg-muted'
                                                                }`}
                                                            />
                                                            <ChevronRight size={14} className="text-muted" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
