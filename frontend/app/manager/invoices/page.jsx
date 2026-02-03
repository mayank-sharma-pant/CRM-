'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText,
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({ canCreate: false });
    const [viewMode, setViewMode] = useState('sales'); // 'sales' or 'manager'

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const isManager = window.location.pathname.startsWith('/manager');
                setViewMode(isManager ? 'manager' : 'sales');

                // Backend invoices endpoint might not exist for some roles yet.
                // Fallback to empty list instead of throwing an error.
                try {
                    const res = await api.get(isManager ? '/manager/invoices' : '/invoices');
                    setInvoices(res.data || []);
                } catch (e) {
                    setInvoices([]);
                }

                setPermissions({
                    canCreate: !isManager
                });
            } catch (error) {
                console.error("Failed to fetch invoices", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'paid': return 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'overdue': return 'text-red-700 bg-red-50 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'pending': return 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
            default: return 'text-slate-700 bg-slate-50 border-slate-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case 'paid': return <CheckCircle2 size={12} />;
            case 'overdue': return <AlertCircle size={12} />;
            default: return <Clock size={12} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

            {/* HEADER */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-slate-400" size={24} />
                            Invoices
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {viewMode === 'manager' ? 'Team Billing Overview' : 'My Invoices'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
                            />
                        </div>

                        {permissions.canCreate && (
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
                                <Plus size={16} />
                                Create Invoice
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-6xl mx-auto px-6 py-8">

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-medium uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="px-6 py-3">Invoice</th>
                                    <th className="px-6 py-3">Client</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    {viewMode === 'manager' && <th className="px-6 py-3">Owner</th>}
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {invoices.length > 0 ? (
                                    invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 text-xs">
                                                {invoice.id}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {invoice.client}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                                {invoice.date}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                                {invoice.dueDate}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">
                                                {invoice.amount}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(invoice.status)}`}>
                                                    {getStatusIcon(invoice.status)}
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            {viewMode === 'manager' && (
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {invoice.owner}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                    <ArrowUpRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                            No invoices found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
