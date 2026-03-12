'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    Receipt,
    ChevronRight,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileText,
    Search,
    Calendar,
    RefreshCw
} from 'lucide-react';

export default function MDInvoicesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/md/invoices');
            setInvoices(res.data.invoices || []);
        } catch (err) {
            console.error("Failed to fetch MD invoices", err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to load invoices.');
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    if (loading) return <InvoicesSkeleton />;

    if (error) {
        return (
            <div className="mx-auto max-w-[1440px] px-6 py-12 bg-page min-h-screen flex items-center justify-center">
                <div className="bg-surface rounded-md border border-border p-8 text-center max-w-md">
                    <AlertTriangle size={32} className="text-error mx-auto mb-4" />
                    <p className="text-[13px] font-bold text-primary mb-4">{error}</p>
                    <button
                        type="button"
                        onClick={fetchInvoices}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-md text-[12px] font-bold uppercase tracking-tight hover:bg-surface text-secondary transition-all"
                    >
                        <RefreshCw size={14} />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        const matchesFilter = filter === 'All' || inv.status === filter;
        const matchesSearch = (inv.client || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(inv.id || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const statusCounts = {
        All: invoices.length,
        Draft: invoices.filter(i => i.status === 'Draft').length,
        Sent: invoices.filter(i => i.status === 'Sent').length,
        Pending: invoices.filter(i => i.status === 'Pending').length,
        Paid: invoices.filter(i => i.status === 'Paid').length,
        Overdue: invoices.filter(i => i.status === 'Overdue').length
    };

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Executive Fiscal Ledger */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Invoicing Matrix</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Managing Director Settlement Overview</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {statusCounts.Overdue > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-error/10 border border-error/20 rounded-md">
                            <AlertTriangle size={14} className="text-error" strokeWidth={2.5} />
                            <span className="text-[12px] font-black text-error uppercase tracking-tight">{statusCounts.Overdue} Arrears Detected</span>
                        </div>
                    )}
                    <div className="h-6 w-px bg-border mx-1"></div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>Fiscal Period</span>
                    </button>
                </div>
            </div>

            {/* Section A: KPI Matrix (Condensed) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPIMini label="Aggregate Volume" value={invoices.length} sub="Active Items" />
                <KPIMini label="Settled Capital" value={statusCounts.Paid} sub="Verified" color="text-success" />
                <KPIMini label="Working Capital" value={statusCounts.Pending + statusCounts.Sent} sub="In-Transit" color="text-warning" />
                <KPIMini label="Fiscal Risk" value={statusCounts.Overdue} sub="Action Required" color="text-error" />
            </div>

            {/* Section B: Filter & Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-2 rounded-md border border-border">
                <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                    {['All', 'Draft', 'Sent', 'Pending', 'Paid', 'Overdue'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${filter === status
                                ? 'bg-surface text-primary shadow-sm'
                                : 'text-muted hover:text-secondary'
                                }`}
                        >
                            {status}
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
                            placeholder="SEARCH SETTLEMENTS..."
                            className="pl-9 pr-4 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent min-w-[240px]"
                        />
                    </div>
                </div>
            </div>

            {/* Section C: Forensic Ledger (Table) */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Identifier</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Client Identity</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Sales Rep</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Value (USD)</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Lifecycle</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Maturity Date</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Linked Sale</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Settlement</th>
                                <th className="py-3 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredInvoices.map((invoice, idx) => (
                                <tr
                                    key={invoice.id}
                                    className={`group hover:bg-surface-elevated/30 cursor-default transition-all ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-3.5 px-5 font-mono text-[12px] font-bold text-primary">{invoice.id}</td>
                                    <td className="py-3.5 px-5 text-[13px] font-bold text-secondary">{invoice.client}</td>
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded flex items-center justify-center bg-surface border border-border text-[10px] font-black text-muted">
                                                {invoice.sales_rep_name ? invoice.sales_rep_name.charAt(0) : 'S'}
                                            </span>
                                            <span className="text-[12px] font-bold text-muted">
                                                {invoice.sales_rep_name || 'System'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 text-[14px] font-black text-primary tabular-nums">{invoice.amount}</td>
                                    <td className="py-3.5 px-5">
                                        <InvoiceStatusBadge status={invoice.status} />
                                    </td>
                                    <td className="py-3.5 px-5 text-[12px] font-bold text-muted uppercase tracking-tight">{invoice.dueDate}</td>
                                    <td className="py-3.5 px-5">
                                        {invoice.linkedSale ? (
                                            <span className="text-[11px] font-black text-accent uppercase tracking-widest bg-accent/5 px-1.5 py-0.5 rounded-[4px] border border-accent/10">
                                                {invoice.linkedSale}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-muted opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <PaymentStatusBadge status={invoice.paymentStatus} />
                                    </td>
                                    <td className="py-3.5 px-5 text-right w-10">
                                        <ChevronRight size={14} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredInvoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-surface-elevated/5">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-4">
                            <Search size={20} className="text-muted/30" />
                        </div>
                        <p className="text-[13px] font-bold text-muted uppercase tracking-widest">No matching records found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function KPIMini({ label, value, sub, color = "text-primary" }) {
    return (
        <div className="bg-surface rounded-md border border-border p-4 shadow-sm hover:bg-surface-elevated transition-colors group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{label}</span>
            <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-[24px] font-black tracking-tighter tabular-nums leading-none ${color}`}>{value}</span>
                <span className="text-[11px] font-bold text-muted uppercase tracking-tight opacity-70">{sub}</span>
            </div>
        </div>
    );
}

function InvoiceStatusBadge({ status }) {
    const maps = {
        Paid: { colors: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
        Pending: { colors: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
        Sent: { colors: 'bg-info/10 text-info border-info/20', icon: Clock },
        Overdue: { colors: 'bg-error/10 text-error border-error/20', icon: AlertTriangle },
        Draft: { colors: 'bg-surface-elevated text-muted border-border', icon: FileText }
    };

    const { colors, icon: Icon } = maps[status] || maps.Draft;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest ${colors}`}>
            <Icon size={12} strokeWidth={2.5} />
            {status}
        </span>
    );
}

function PaymentStatusBadge({ status }) {
    if (status === 'Settled') {
        return (
            <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-success"></div>
                <span className="text-[11px] font-black text-success uppercase tracking-widest">Settled</span>
            </div>
        );
    }
    if (status === 'Awaiting') {
        return (
            <div className="flex items-center gap-1.5 text-muted/60">
                <div className="w-1 h-1 rounded-full bg-current"></div>
                <span className="text-[11px] font-black uppercase tracking-widest">Awaiting</span>
            </div>
        );
    }
    return <span className="text-[11px] text-muted opacity-30">—</span>;
}

function InvoicesSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 py-4 space-y-6 animate-pulse bg-page min-h-screen">
            <div className="flex justify-between py-4 border-b border-border">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-surface border border-border rounded"></div>
                    <div className="h-4 w-64 bg-surface border border-border rounded"></div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface border border-border rounded-md"></div>)}
            </div>
            <div className="h-12 bg-surface border border-border rounded-md"></div>
            <div className="h-[400px] bg-surface border border-border rounded-md"></div>
        </div>
    );
}
