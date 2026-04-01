'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    TrendingUp,
    Activity,
    PieChart,
    ChevronRight,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';

const TABS = [
    { id: 'sales', label: 'Sales', icon: TrendingUp, href: '/md/sales' },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, href: '/md/monitoring' },
    { id: 'reports', label: 'Reports', icon: PieChart, href: '/md/reports' },
];

export default function MDPerformancePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sales, setSales] = useState(null);
    const [monitoring, setMonitoring] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [salesRes, monitoringRes] = await Promise.all([
                api.get('/md/sales'),
                api.get('/md/monitoring'),
            ]);
            setSales(salesRes.data);
            setMonitoring(monitoringRes.data);
        } catch (err) {
            console.error('Failed to fetch MD performance', err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to load performance data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const kpis = useMemo(() => {
        const won = sales?.summary?.won ?? 0;
        const total = sales?.summary?.total_deals ?? 0;
        const winRate = sales?.summary?.win_rate ?? 0;
        const activeAlerts = monitoring?.alerts?.length ?? 0;
        const highSeverity = (monitoring?.alerts || []).filter((a) => a?.severity === 'High').length;
        return [
            { label: 'Deals (Total)', value: total },
            { label: 'Won', value: won },
            { label: 'Win Rate', value: `${winRate}%` },
            { label: 'Active Alerts', value: activeAlerts, tone: activeAlerts > 0 ? 'warn' : 'ok' },
            { label: 'High Severity', value: highSeverity, tone: highSeverity > 0 ? 'danger' : 'ok' },
        ];
    }, [sales, monitoring]);

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Performance</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">
                        Sales + monitoring + reports in one place
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-surface rounded-md border border-error/30 p-4 flex items-center gap-3">
                    <AlertTriangle className="text-error" size={18} />
                    <div className="text-[12px] font-bold text-error uppercase tracking-widest">{error}</div>
                </div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {kpis.map((k) => (
                    <div key={k.label} className="bg-surface rounded-md border border-border p-4 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">{k.label}</div>
                        <div
                            className={`mt-1 text-[22px] font-black tracking-tighter tabular-nums ${
                                k.tone === 'danger' ? 'text-error' : k.tone === 'warn' ? 'text-warning' : 'text-primary'
                            }`}
                        >
                            {k.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-surface p-1 rounded-md border border-border w-fit">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[11px] font-black uppercase tracking-tight transition-all ${
                                active ? 'bg-page text-primary shadow-sm border border-border' : 'text-muted hover:text-secondary'
                            }`}
                        >
                            <Icon size={14} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Content: trimmed previews + deep links */}
            <div className="bg-surface rounded-md border border-border shadow-sm p-5">
                {loading ? (
                    <div className="text-[12px] text-muted font-bold uppercase tracking-widest">Loading…</div>
                ) : (
                    <>
                        {activeTab === 'sales' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[13px] font-black uppercase tracking-widest text-primary">Sales snapshot</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/md/sales')}
                                        className="inline-flex items-center gap-2 text-[11px] font-black text-accent uppercase tracking-tight hover:text-accent-hover"
                                    >
                                        Open full sales analytics <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="text-[12px] text-muted">
                                    Total deals: <span className="font-bold text-primary">{sales?.summary?.total_deals ?? 0}</span> • Active:{' '}
                                    <span className="font-bold text-primary">{sales?.summary?.active ?? 0}</span> • Won:{' '}
                                    <span className="font-bold text-primary">{sales?.summary?.won ?? 0}</span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'monitoring' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[13px] font-black uppercase tracking-widest text-primary">Monitoring snapshot</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/md/monitoring')}
                                        className="inline-flex items-center gap-2 text-[11px] font-black text-accent uppercase tracking-tight hover:text-accent-hover"
                                    >
                                        Open monitoring <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="text-[12px] text-muted">
                                    Alerts: <span className="font-bold text-primary">{monitoring?.alerts?.length ?? 0}</span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[13px] font-black uppercase tracking-widest text-primary">Custom reports</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/md/reports')}
                                        className="inline-flex items-center gap-2 text-[11px] font-black text-accent uppercase tracking-tight hover:text-accent-hover"
                                    >
                                        Open report builder <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="text-[12px] text-muted">
                                    Use filters (date/source/service type) to generate segmented revenue + pipeline reports.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

