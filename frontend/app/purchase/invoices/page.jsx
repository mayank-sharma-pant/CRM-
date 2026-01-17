'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    Receipt,
    ChevronRight,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileText,
    Search,
    Calendar
} from 'lucide-react';

export default function PurchaseInvoicesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setTimeout(() => {
            // Mock invoice data with additional fields
            const invoiceData = [
                { id: 'INV-2024-001', client: 'BigBank International', amount: '$12,500.00', status: 'Paid', dueDate: '2024-01-15', linkedSale: 'SAL-2024-003', paymentStatus: 'Settled', date: '2023-12-15' },
                { id: 'INV-2024-002', client: 'TechFlow Inc.', amount: '$4,250.00', status: 'Overdue', dueDate: '2024-01-10', linkedSale: 'SAL-2024-005', paymentStatus: 'Awaiting', date: '2023-12-20' },
                { id: 'INV-2024-003', client: 'Solaris Systems', amount: '$8,000.00', status: 'Pending', dueDate: '2024-01-25', linkedSale: 'SAL-2024-006', paymentStatus: 'Awaiting', date: '2024-01-05' },
                { id: 'INV-2024-004', client: 'Future Net', amount: '$2,100.00', status: 'Sent', dueDate: '2024-01-20', linkedSale: 'SAL-2024-007', paymentStatus: 'Awaiting', date: '2024-01-08' },
                { id: 'INV-2024-005', client: 'Global Dynamics', amount: '$15,000.00', status: 'Draft', dueDate: '2024-02-01', linkedSale: 'SAL-2024-001', paymentStatus: 'N/A', date: '2024-01-10' },
                { id: 'INV-2024-006', client: 'CloudNet Corp', amount: '$5,500.00', status: 'Paid', dueDate: '2024-01-05', linkedSale: 'SAL-2024-004', paymentStatus: 'Settled', date: '2023-12-10' },
                { id: 'INV-2024-007', client: 'Alpha Group', amount: '$3,200.00', status: 'Overdue', dueDate: '2024-01-08', linkedSale: null, paymentStatus: 'Awaiting', date: '2023-12-25' }
            ];
            setInvoices(invoiceData);
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <InvoicesSkeleton />;

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        const matchesFilter = filter === 'All' || inv.status === filter;
        const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.id.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Invoices</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage and track all invoices.</p>
                </div>
                {statusCounts.Overdue > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
                        <span className="text-[13px] font-semibold text-red-700 dark:text-red-400">{statusCounts.Overdue} Overdue</span>
                    </div>
                )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {['All', 'Draft', 'Sent', 'Pending', 'Paid', 'Overdue'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${filter === status
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status} ({statusCounts[status]})
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search invoices..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Date Range */}
                <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Calendar size={14} />
                    <span>Date Range</span>
                </button>
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Invoice ID</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Client</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Amount</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Due Date</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Linked Sale</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Payment</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredInvoices.map((invoice) => (
                            <tr
                                key={invoice.id}
                                onClick={() => router.push(`/purchase/invoices/${encodeURIComponent(invoice.id)}`)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                                <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">{invoice.id}</td>
                                <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{invoice.client}</td>
                                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{invoice.amount}</td>
                                <td className="px-5 py-3.5">
                                    <InvoiceStatusBadge status={invoice.status} />
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{invoice.dueDate}</td>
                                <td className="px-5 py-3.5">
                                    {invoice.linkedSale ? (
                                        <span className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400">{invoice.linkedSale}</span>
                                    ) : (
                                        <span className="text-[12px] text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-5 py-3.5">
                                    <PaymentStatusBadge status={invoice.paymentStatus} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <ChevronRight size={16} className="inline text-slate-300" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredInvoices.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                        No invoices found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}

function InvoiceStatusBadge({ status }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    let Icon = FileText;

    if (status === 'Paid') {
        colors = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        Icon = CheckCircle;
    } else if (status === 'Pending' || status === 'Sent') {
        colors = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        Icon = Clock;
    } else if (status === 'Overdue') {
        colors = 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        Icon = AlertTriangle;
    } else if (status === 'Draft') {
        colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        Icon = FileText;
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${colors}`}>
            <Icon size={12} />
            {status}
        </span>
    );
}

function PaymentStatusBadge({ status }) {
    if (status === 'Settled') {
        return <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Settled</span>;
    } else if (status === 'Awaiting') {
        return <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Awaiting</span>;
    }
    return <span className="text-[11px] text-slate-400">-</span>;
}

function InvoicesSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
