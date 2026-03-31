'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../services/api';
import { 
    ChevronLeft, 
    Mail, 
    Briefcase, 
    Calendar, 
    PieChart, 
    TrendingUp, 
    ShoppingCart, 
    CheckCircle2,
    Clock,
    IndianRupee,
    Target
} from 'lucide-react';

export default function TeamMemberDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, [id]);

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/manager/team/${id}/performance`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch performance", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-page">
                <div className="text-sm font-medium text-muted animate-pulse">Retrieving performance metrics...</div>
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Failed to load member data.</div>;
    }

    const { member, metrics } = data;

    return (
        <div className="min-h-screen bg-page">
            {/* Header / Navigation */}
            <div className="bg-surface border-b border-border sticky top-0 z-10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button 
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors text-sm font-medium"
                    >
                        <ChevronLeft size={16} /> Back to Team
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                            <h1 className="text-lg font-bold text-primary leading-tight">{member.full_name}</h1>
                            <p className="text-[11px] text-muted font-bold uppercase tracking-widest">{member.role} Profile</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg">
                            {member.full_name.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Profile Overview Card */}
                <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 mb-8 flex flex-col md:flex-row gap-12 items-start md:items-center">
                    <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2 text-muted">
                                <Mail size={16} className="text-accent" />
                                <span className="font-medium text-secondary">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted">
                                <Briefcase size={16} className="text-accent" />
                                <span className="font-medium text-secondary">Sales Executive</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted">
                                <Calendar size={16} className="text-accent" />
                                <span className="font-medium text-secondary italic">Joined {new Date(member.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-accent/5 border border-accent/10 rounded-xl text-center min-w-[120px]">
                            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Conversion</p>
                            <p className="text-2xl font-black text-primary">{metrics.leads.conversion_rate}%</p>
                        </div>
                        <div className="px-6 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center min-w-[120px]">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Orders</p>
                            <p className="text-2xl font-black text-primary">{metrics.orders.total_count}</p>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Leads Management */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Target size={20} />
                                </div>
                                <h3 className="font-bold text-primary">Leads Pipeline</h3>
                            </div>
                            <PieChart size={18} className="text-muted" />
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-secondary">Total Leads Assigned</span>
                                <span className="text-lg font-bold text-primary">{metrics.leads.total}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 h-full" style={{ width: `${metrics.leads.conversion_rate}%` }} />
                                <div className="bg-slate-300 h-full" style={{ width: `${(metrics.leads.lost / metrics.leads.total * 100) || 0}%` }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Converted</p>
                                    <p className="text-lg font-bold text-emerald-700">{metrics.leads.converted}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dropped/Lost</p>
                                    <p className="text-lg font-bold text-slate-600">{metrics.leads.lost}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Attribution */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <IndianRupee size={20} />
                                </div>
                                <h3 className="font-bold text-primary">Sales Revenue</h3>
                            </div>
                            <TrendingUp size={18} className="text-muted" />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Revenue Sourced</p>
                                <p className="text-3xl font-black text-primary">₹ {metrics.orders.total_value.toLocaleString()}</p>
                            </div>
                            <div className="pt-4 border-t border-border">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-emerald-600">Paid Realization</span>
                                    <span className="text-sm font-bold text-primary">₹ {metrics.orders.paid_value.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full transition-all duration-1000" 
                                        style={{ width: `${(metrics.orders.paid_value / metrics.orders.total_value * 100) || 0}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Efficiency */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h3 className="font-bold text-primary">Tasks & Activity</h3>
                            </div>
                            <Clock size={18} className="text-muted" />
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-violet-600 uppercase mb-0.5">Completed Tasks</p>
                                        <p className="text-2xl font-bold text-primary">{metrics.tasks.completed}</p>
                                    </div>
                                    <CheckCircle2 className="text-violet-200" size={32} />
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-orange-600 uppercase mb-0.5">Pending Follow-ups</p>
                                        <p className="text-2xl font-bold text-primary">{metrics.tasks.pending}</p>
                                    </div>
                                    <Clock className="text-orange-200" size={32} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footnote */}
                <div className="text-center">
                    <p className="text-[11px] text-muted font-bold uppercase tracking-widest opacity-60">
                        Performance data is calculated based on verified invoices and lead conversion cycles.
                    </p>
                </div>
            </div>
        </div>
    );
}
