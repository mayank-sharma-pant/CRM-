'use client';

import { useState, useEffect } from 'react';
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
    Plus,
    X,
    Trash2
} from 'lucide-react';

export default function PurchaseInvoicesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/purchase/invoices');
            const mappedInvoices = (res.data.invoices || []).map(inv => ({
                ...inv,
                id: inv.number || `INV-${inv.id}`,
                db_id: inv.id,
                dueDate: inv.due,
                originDate: inv.issued,
                status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1)
            }));
            setInvoices(mappedInvoices);
        } catch (err) {
            console.error("Failed to fetch purchase invoices", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, []);

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
        Sent: invoices.filter(i => i.status === 'Sent').length,
        Pending: invoices.filter(i => i.status === 'Pending').length,
        Paid: invoices.filter(i => i.status === 'Paid').length,
        Overdue: invoices.filter(i => i.status === 'Overdue').length
    };

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Fiscal Control Plane */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Purchase Invoices</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Forensic Settlement Ledger</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {statusCounts.Overdue > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-error/10 border border-error/20 rounded-md">
                            <AlertTriangle size={14} className="text-error" strokeWidth={2.5} />
                            <span className="text-[12px] font-black text-error uppercase tracking-tight">{statusCounts.Overdue} Critical Lag</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-black uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
                    >
                        <FileText size={14} strokeWidth={2.5} />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Section A: KPI Matrix (Condensed) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPIMini label="Total Volume" value={invoices.length} sub="Active Items" />
                <KPIMini label="Settled" value={statusCounts.Paid} sub="Verification Complete" color="text-success" />
                <KPIMini label="Pending" value={statusCounts.Pending + statusCounts.Sent} sub="In-Transit" color="text-warning" />
                <KPIMini label="Overdue" value={statusCounts.Overdue} sub="Action Required" color="text-error" />
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
                            placeholder="SEARCH FORENSICS..."
                            className="pl-9 pr-4 py-1.5 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent min-w-[240px]"
                        />
                    </div>
                </div>
            </div>

            {/* Section C: Forensic Ledger (Table) */}
            <div className="bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Identifier</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Counterparty</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Fiscal Value</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Lifecycle</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Maturity Date</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Issued</th>
                                <th className="py-3 px-5 text-[10px] font-black text-muted uppercase tracking-widest">Settlement</th>
                                <th className="py-3 px-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredInvoices.map((invoice, idx) => (
                                <tr
                                    key={invoice.db_id}
                                    onClick={() => router.push(`/purchase/invoices/${encodeURIComponent(invoice.db_id)}`)}
                                    className={`group hover:bg-surface-elevated/30 cursor-pointer transition-all ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                                >
                                    <td className="py-3.5 px-5 font-mono text-[12px] font-bold text-primary">{invoice.id}</td>
                                    <td className="py-3.5 px-5 text-[13px] font-bold text-secondary">{invoice.client}</td>
                                    <td className="py-3.5 px-5 text-[14px] font-black text-primary tabular-nums">
                                        ${Number(invoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <InvoiceStatusBadge status={invoice.status} />
                                    </td>
                                    <td className="py-3.5 px-5 text-[12px] font-bold text-muted uppercase tracking-tight">{invoice.dueDate || '—'}</td>
                                    <td className="py-3.5 px-5 text-[12px] font-bold text-muted uppercase tracking-tight">{invoice.originDate || '—'}</td>
                                    <td className="py-3.5 px-5">
                                        <PaymentStatusBadge status={invoice.status === 'Paid' ? 'Settled' : invoice.status === 'Draft' ? null : 'Awaiting'} />
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

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <CreateInvoiceModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchInvoices(); }}
                />
            )}
        </div>
    );
}

// --- CREATE INVOICE MODAL ---

function CreateInvoiceModal({ onClose, onCreated }) {
    const [clients, setClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [dueDays, setDueDays] = useState(30);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get('/purchase/invoices').then(() => {});
        // Fetch clients for dropdown
        api.get('/clients').then(res => {
            setClients(res.data.clients || res.data || []);
        }).catch(() => {});
    }, []);

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx, field, value) => {
        const updated = [...items];
        updated[idx][field] = field === 'quantity' ? parseInt(value) || 1 : field === 'unit_price' ? parseFloat(value) || 0 : value;
        setItems(updated);
    };

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = subtotal + tax - discount;

    const handleSubmit = async () => {
        if (!clientId) { alert('Please select a client'); return; }
        if (items.some(i => !i.description.trim())) { alert('All items need a description'); return; }
        setSubmitting(true);
        try {
            await api.post('/purchase/invoices', {
                client_id: parseInt(clientId),
                items: items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
                tax, discount, due_days: dueDays, notes: notes || null
            });
            alert('Invoice created successfully!');
            onCreated();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Invoice</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* Client */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client *</label>
                        <select
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="">Select client...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Line Items */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Line Items *</label>
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                        placeholder="Description"
                                        className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    />
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                        placeholder="Qty"
                                        className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center"
                                        min={1}
                                    />
                                    <input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                        placeholder="Price"
                                        className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right"
                                        min={0}
                                        step={0.01}
                                    />
                                    {items.length > 1 && (
                                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={addItem} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                            <Plus size={12} /> Add Item
                        </button>
                    </div>

                    {/* Tax & Discount */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tax ($)</label>
                            <input type="number" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                min={0} step={0.01} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Discount ($)</label>
                            <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                min={0} step={0.01} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due (days)</label>
                            <input type="number" value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value) || 30)}
                                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                min={1} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            placeholder="Optional notes..." />
                    </div>

                    {/* Totals */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Tax</span><span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Discount</span><span>-${discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                            <span>Total</span><span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                        className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                        {submitting ? 'Creating...' : 'Create Invoice'}
                    </button>
                </div>
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
