'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Award,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Search,
    Filter,
    ArrowUpRight,
    Target,
    Zap
} from 'lucide-react';

export default function MDPointsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                setLoading(true);
                // Assume /md/points or /md/performance endpoint
                const res = await api.get('/md/points');
                setPerformance(res.data.performance || []);
            } catch (err) {
                console.error("Failed to fetch MD points", err);
                setPerformance([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, []);

    if (loading) return <PointsSkeleton />;

    const filteredPerformance = performance.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Incentive Engine Control */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Incentive Engine</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Employee Performance Points & Tier Distribution</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-black uppercase tracking-tight transition-all shadow-sm shadow-accent/10">
                        <Zap size={14} strokeWidth={2.5} />
                        Recalculate Bounds
                    </button>
                </div>
            </div>

            {/* Section A: Global Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPIMini label="Aggregate Points" value="284.2k" sub="+12% vs LY" color="text-primary" />
                <KPIMini label="Bonus Provision" value="$1.42M" sub="Fiscal Q1" color="text-accent" />
                <KPIMini label="Active Tiers" value="4 Classes" sub="Silver to Titanium" color="text-secondary" />
                <KPIMini label="Top Performer" value="Alex Rivera" sub="Titanium 2.4k" color="text-success" />
            </div>

            {/* Section B: Filter & Search */}
            <div className="flex items-center justify-between bg-surface p-2 rounded-md border border-border">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={2.5} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH PERFORMANCE LEDGER..."
                        className="pl-9 pr-4 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent min-w-[320px]"
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold text-secondary uppercase tracking-tight hover:bg-border/50">
                    <Filter size={14} className="text-muted" strokeWidth={2.5} />
                    <span>Incentivization Tiers</span>
                </button>
            </div>

            {/* Section C: Performance Ledger */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Employee</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Current Points</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Incentive Tier</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Target Progress</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Bonus Accrued</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest text-center">Velocity</th>
                                <th className="py-3 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredPerformance.map((emp, idx) => (
                                <tr
                                    key={emp.id}
                                    className={`group hover:bg-surface-elevated/30 transition-all ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[12px] font-black text-accent uppercase">
                                                {emp.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-bold text-primary">{emp.name}</div>
                                                <div className="text-[10px] font-black text-muted uppercase tracking-widest">{emp.id} • {emp.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-5">
                                        <div className="text-[14px] font-black text-primary tabular-nums tracking-tight">{emp.points.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold text-muted uppercase">Global Rank: #{idx + 1}</div>
                                    </td>
                                    <td className="py-4 px-5">
                                        <TierBadge tier={emp.tier} />
                                    </td>
                                    <td className="py-4 px-5 w-48">
                                        <div className="flex justify-between items-center mb-1.5 px-0.5">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-tight">{Math.round((emp.points / emp.target) * 100)}% to Target</span>
                                            <span className="text-[10px] font-black text-primary tabular-nums">{emp.points}/{emp.target}</span>
                                        </div>
                                        <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]"
                                                style={{ width: `${Math.min(100, (emp.points / emp.target) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-4 px-5 text-[14px] font-black text-primary tabular-nums">{emp.bonus}</td>
                                    <td className="py-4 px-5 text-center">
                                        {emp.trend === 'up' && <TrendingUp size={16} className="text-success mx-auto" strokeWidth={3} />}
                                        {emp.trend === 'down' && <TrendingDown size={16} className="text-error mx-auto" strokeWidth={3} />}
                                        {emp.trend === 'flat' && <Minus size={16} className="text-muted mx-auto" strokeWidth={3} />}
                                    </td>
                                    <td className="py-4 px-5 text-right w-10">
                                        <button className="p-1.5 rounded-md hover:bg-surface-elevated text-muted hover:text-accent transition-all">
                                            <ArrowUpRight size={14} strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredPerformance.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-surface-elevated/5 text-muted/30">
                        <Award size={48} />
                        <p className="mt-4 text-[13px] font-black uppercase tracking-widest">No matching performance records</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function KPIMini({ label, value, sub, color = "text-primary" }) {
    return (
        <div className="bg-surface rounded-md border border-border p-5 shadow-sm hover:bg-surface-elevated transition-colors group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{label}</span>
            <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-[28px] font-black tracking-tighter tabular-nums leading-none ${color}`}>{value}</span>
                <span className="text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">{sub}</span>
            </div>
        </div>
    );
}

function TierBadge({ tier }) {
    const maps = {
        Titanium: 'bg-primary text-white border-primary shadow-[0_0_12px_rgba(0,0,0,0.1)]',
        Platinum: 'bg-surface-elevated text-primary border-primary/20',
        Gold: 'bg-warning/10 text-warning border-warning/20',
        Silver: 'bg-surface-elevated text-muted border-border'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest ${maps[tier] || maps.Silver}`}>
            <Award size={10} strokeWidth={3} />
            {tier}
        </span>
    );
}

function PointsSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="h-10 w-48 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-md"></div>)}
            </div>
            <div className="h-12 bg-surface border border-border rounded-md"></div>
            <div className="h-[400px] bg-surface border border-border rounded-md"></div>
        </div>
    );
}
