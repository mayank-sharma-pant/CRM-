'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    ChevronRight,
    Filter,
    Calendar,
    Search
} from 'lucide-react';

export default function PurchaseSalesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setTimeout(() => {
            // Mock sales data for purchase review
            const salesData = [
                { id: 1, saleId: 'SAL-2024-001', client: 'BigBank International', amount: '$45,000', discount: '5%', status: 'Pending Review', createdDate: '2024-01-10', rep: 'Alex Johnson', reviewerStatus: 'Unreviewed' },
                { id: 2, saleId: 'SAL-2024-002', client: 'TechFlow Inc.', amount: '$12,500', discount: '0%', status: 'Pending Review', createdDate: '2024-01-09', rep: 'Sarah Smith', reviewerStatus: 'Unreviewed' },
                { id: 3, saleId: 'SAL-2024-003', client: 'Solaris Systems', amount: '$28,000', discount: '10%', status: 'Approved', createdDate: '2024-01-08', rep: 'Mike Brown', reviewerStatus: 'Reviewed' },
                { id: 4, saleId: 'SAL-2024-004', client: 'CloudNet Corp', amount: '$8,200', discount: '2%', status: 'Pending Review', createdDate: '2024-01-07', rep: 'Alex Johnson', reviewerStatus: 'Unreviewed' },
                { id: 5, saleId: 'SAL-2024-005', client: 'Global Dynamics', amount: '$67,500', discount: '15%', status: 'Rejected', createdDate: '2024-01-05', rep: 'Sarah Smith', reviewerStatus: 'Reviewed' },
                { id: 6, saleId: 'SAL-2024-006', client: 'Horizon Tech', amount: '$23,400', discount: '8%', status: 'Approved', createdDate: '2024-01-04', rep: 'Mike Brown', reviewerStatus: 'Reviewed' },
                { id: 7, saleId: 'SAL-2024-007', client: 'Pinnacle Inc.', amount: '$56,000', discount: '12%', status: 'Pending Review', createdDate: '2024-01-03', rep: 'Alex Johnson', reviewerStatus: 'In Progress' }
            ];
            setSales(salesData);
            setLoading(false);
        }, 400);
    }, []);

    if (loading) return <SalesSkeleton />;

    // Filter sales
    const filteredSales = sales.filter(sale => {
        const matchesStatus = statusFilter === 'All' || sale.status === statusFilter;
        const matchesSearch = sale.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.saleId.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const statusCounts = {
        All: sales.length,
        'Pending Review': sales.filter(s => s.status === 'Pending Review').length,
        Approved: sales.filter(s => s.status === 'Approved').length,
        Rejected: sales.filter(s => s.status === 'Rejected').length
    };

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Sales Review</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Review and approve sales transactions.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">{statusCounts['Pending Review']} Pending</span>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Status Filter Tabs */}
                <div className="flex gap-2">
                    {['All', 'Pending Review', 'Approved', 'Rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${statusFilter === status
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status === 'Pending Review' ? 'Pending' : status} ({statusCounts[status]})
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
                        placeholder="Search sales..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Date Range (placeholder) */}
                <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Calendar size={14} />
                    <span>Date Range</span>
                </button>
            </div>

            {/* Sales Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Sale ID</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Client</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Amount</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Discount</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Created</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Reviewer</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredSales.map((sale) => (
                            <tr
                                key={sale.id}
                                onClick={() => router.push(`/purchase/sales/${sale.id}`)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                                <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{sale.saleId}</td>
                                <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{sale.client}</td>
                                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{sale.amount}</td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{sale.discount}</td>
                                <td className="px-5 py-3.5">
                                    <StatusBadge status={sale.status} />
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{sale.createdDate}</td>
                                <td className="px-5 py-3.5">
                                    <ReviewerBadge status={sale.reviewerStatus} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <ChevronRight size={16} className="inline text-slate-300" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredSales.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                        No sales found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (status === 'Pending Review') {
        colors = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else if (status === 'Approved') {
        colors = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    } else if (status === 'Rejected') {
        colors = 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase ${colors}`}>
            {status === 'Pending Review' ? 'Pending' : status}
        </span>
    );
}

function ReviewerBadge({ status }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (status === 'Unreviewed') {
        colors = 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    } else if (status === 'In Progress') {
        colors = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else if (status === 'Reviewed') {
        colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${colors}`}>
            {status}
        </span>
    );
}

function SalesSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
