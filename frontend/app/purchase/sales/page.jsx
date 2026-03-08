'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Search,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    ShoppingCart,
    Filter
} from 'lucide-react';

export default function PurchaseSalesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchSales = async () => {
            try {
                setLoading(true);
                const res = await api.get('/purchase/sales');
                const mappedSales = (res.data.sales || []).map(sale => ({
                    ...sale,
                    saleId: `SAL-${sale.id}`,
                    createdDate: sale.date,
                    reviewerStatus: sale.status === 'pending' ? 'Pending Review' : 'Verified',
                    status: sale.status === 'pending' ? 'Pending Review' : sale.status.charAt(0).toUpperCase() + sale.status.slice(1)
                }));
                setSales(mappedSales);
            } catch (err) {
                console.error("Failed to fetch purchase sales", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    if (loading) return <SalesSkeleton />;

    const filteredSales = sales.filter(sale => {
        const matchesStatus = statusFilter === 'All' || sale.status === statusFilter;
        const matchesSearch = (sale.client || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sale.saleId || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const statusCounts = {
        All: sales.length,
        'Pending Review': sales.filter(s => s.status === 'Pending Review').length,
        Approved: sales.filter(s => s.status === 'Approved').length,
        Rejected: sales.filter(s => s.status === 'Rejected').length
    };

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Procurement Review Cockpit */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Sales Review Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Transaction Approval & Fiscal Validation</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {statusCounts['Pending Review'] > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/20 rounded-md">
                            <Clock size={14} className="text-warning" strokeWidth={2.5} />
                            <span className="text-[12px] font-black text-warning uppercase tracking-tight">{statusCounts['Pending Review']} Awaiting Verification</span>
                        </div>
                    )}
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Filter Period</span>
                    </button>
                </div>
            </div>

            {/* Section A: Filter & Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-2 rounded-md border border-border">
                <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                    {['All', 'Pending Review', 'Approved', 'Rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${statusFilter === status
                                ? 'bg-surface text-primary shadow-sm'
                                : 'text-muted hover:text-secondary'
                                }`}
                        >
                            {status === 'Pending Review' ? 'Pending' : status}
                            <span className="ml-1.5 opacity-50">({statusCounts[status]})</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={2.5} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="SEARCH TRANSACTIONS..."
                            className="pl-9 pr-4 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent min-w-[240px]"
                        />
                    </div>
                </div>
            </div>

            {/* Section B: Sales Ledger (Table) */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Sale ID</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Client Identity</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Value (USD)</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Variance</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Status</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Origin Date</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Audit State</th>
                                <th className="py-3 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredSales.map((sale, idx) => (
                                <tr
                                    key={sale.id}
                                    onClick={() => router.push(`/purchase/sales/${sale.id}`)}
                                    className={`group hover:bg-surface-elevated/30 cursor-pointer transition-all ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-3.5 px-5 font-mono text-[12px] font-bold text-primary whitespace-nowrap">{sale.saleId}</td>
                                    <td className="py-3.5 px-5 text-[13px] font-bold text-secondary whitespace-nowrap">{sale.client}</td>
                                    <td className="py-3.5 px-5 text-[14px] font-black text-primary tabular-nums whitespace-nowrap">{sale.amount}</td>
                                    <td className="py-3.5 px-5 whitespace-nowrap">
                                        <span className={`text-[11px] font-bold ${parseFloat(sale.discount?.replace('%', '') || 0) > 10 ? 'text-error' : 'text-muted'
                                            }`}>
                                            {sale.discount || '0%'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-5 whitespace-nowrap">
                                        <StatusBadge status={sale.status} />
                                    </td>
                                    <td className="py-3.5 px-5 text-[12px] font-bold text-muted uppercase tracking-tight font-mono whitespace-nowrap">{sale.createdDate}</td>
                                    <td className="py-3.5 px-5 whitespace-nowrap">
                                        <ReviewerBadge status={sale.reviewerStatus} />
                                    </td>
                                    <td className="py-3.5 px-5 text-right w-10 whitespace-nowrap">
                                        <ChevronRight size={14} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSales.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-surface-elevated/5">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-4">
                            <ShoppingCart size={20} className="text-muted/30" />
                        </div>
                        <p className="text-[13px] font-bold text-muted uppercase tracking-widest">No matching sales records</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function StatusBadge({ status }) {
    const maps = {
        'Pending Review': { colors: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
        Approved: { colors: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
        Rejected: { colors: 'bg-error/10 text-error border-error/20', icon: XCircle }
    };

    const { colors, icon: Icon } = maps[status] || { colors: 'bg-surface-elevated text-muted border-border', icon: Filter };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest ${colors}`}>
            <Icon size={12} strokeWidth={2.5} />
            {status === 'Pending Review' ? 'Pending' : status}
        </span>
    );
}

function ReviewerBadge({ status }) {
    const maps = {
        Unreviewed: 'text-info',
        'In Progress': 'text-warning',
        Reviewed: 'text-muted'
    };

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-1 h-1 rounded-full bg-current ${maps[status] || 'text-muted'}`}></div>
            <span className={`text-[11px] font-bold uppercase tracking-tight ${maps[status] || 'text-muted'}`}>
                {status}
            </span>
        </div>
    );
}

function SalesSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-surface border border-border rounded"></div>
                    <div className="h-4 w-64 bg-surface border border-border rounded"></div>
                </div>
            </div>
            <div className="h-12 bg-surface border border-border rounded-md"></div>
            <div className="h-[400px] bg-surface border border-border rounded-md"></div>
        </div>
    );
}
