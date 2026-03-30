'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../../services/api';
import {
    ChevronRight,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileText,
    Search,
    Calendar,
    Plus
} from 'lucide-react';
import CreateOrderModal from '../../../components/shared/CreateOrderModal';

export default function SalesOrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            // The backend endpoint `/invoices` is already scoped in invoices.py to only 
            // return the current user's explicitly generated invoices if role == 'sales'
            const clientId = searchParams?.get('clientId');
            const res = await api.get('/invoices', { params: clientId ? { client_id: clientId } : undefined });
            const mappedInvoices = (res.data.items || []).map(inv => ({
                ...inv,
                db_id: inv.id,
                id: inv.invoice_number,
                dueDate: inv.due_date,
                originDate: inv.issued_date,
            }));
            setInvoices(mappedInvoices);
        } catch (err) {
            console.error("Failed to fetch sourced orders", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, [searchParams]);

    if (loading) return <InvoicesSkeleton />;

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        const matchesFilter = filter === 'All' || inv.status === filter;
        const matchesSearch = (inv.client || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.id || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const statusCounts = {
        All: invoices.length,
        Draft: invoices.filter(i => i.status === 'Draft').length,
        Sent: invoices.filter(i => i.status === 'Sent' || i.status === 'Pending').length,
        Paid: invoices.filter(i => i.status === 'Paid').length,
    };

    const totalRevenueSourced = invoices.filter(i => i.status !== 'Cancelled').reduce((sum, inv) => sum + (inv.total || 0), 0);

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">My Sourced Orders</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Track Transactions You Generated</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total Value Sourced</span>
                        <span className="text-[16px] font-black text-emerald-400 leading-none">₹{totalRevenueSourced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-black uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Create Order
                    </button>
                </div>
            </div>

            {/* Section A: KPI Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPIMini label="Total Sourced" value={statusCounts.All} sub="Orders Generated" />
                <KPIMini label="Settled / Paid" value={statusCounts.Paid} sub="Revenue Realized" color="text-success" />
                <KPIMini label="Pending Approval" value={statusCounts.Sent} sub="Awaiting Purchase" color="text-warning" />
                <KPIMini label="Drafts" value={statusCounts.Draft} sub="Unsubmitted" color="text-muted" />
            </div>

            {/* Section B: Filter & Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-2 rounded-md border border-border">
                <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                    {['All', 'Draft', 'Pending', 'Paid'].map((status) => (
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
                            placeholder="SEARCH ORDERS..."
                            className="pl-9 pr-4 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent min-w-[240px]"
                        />
                    </div>
                </div>
            </div>

            {/* Section C: Ledger (Table) */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Identifier</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Client</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Order Value</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Status</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Issued Date</th>
                                <th className="py-3 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredInvoices.map((invoice, idx) => (
                                <tr
                                    key={invoice.db_id}
                                    onClick={() => router.push(`/sales/invoices/${encodeURIComponent(invoice.db_id)}`)}
                                    className={`group hover:bg-surface-elevated/30 cursor-pointer transition-all ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-3.5 px-5 font-mono text-[12px] font-bold text-primary">{invoice.id}</td>
                                    <td className="py-3.5 px-5 text-[13px] font-bold text-secondary">{invoice.client}</td>
                                    <td className="py-3.5 px-5 text-[14px] font-black text-primary tabular-nums">
                                        ₹{Number(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <InvoiceStatusBadge status={invoice.status} />
                                    </td>
                                    <td className="py-3.5 px-5 text-[12px] font-bold text-muted uppercase tracking-tight">{invoice.originDate || '—'}</td>
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
                        <p className="text-[13px] font-bold text-muted uppercase tracking-widest">No matching orders generated by you.</p>
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            <CreateOrderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={() => { setShowCreateModal(false); fetchInvoices(); }}
                endpoint="/invoices"
            />
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
