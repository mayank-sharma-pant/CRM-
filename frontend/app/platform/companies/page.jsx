'use client';

import { useEffect, useState } from 'react';
import { Building2, Search, Users, Eye } from 'lucide-react';
import Link from 'next/link';

const PLATFORM_API = '/api/platform';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-success border-emerald-100',
    pending: 'bg-amber-50 text-warning border-amber-100',
    suspended: 'bg-red-50 text-error border-red-100',
    rejected: 'bg-surface-elevated text-secondary border-border',
    trial: 'bg-emerald-50 text-success border-emerald-100',
};

export default function CompaniesListPage() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, [statusFilter]);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);

            const response = await fetch(`${PLATFORM_API}/companies?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setCompanies(data.companies || []);
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const planLabel = (planId) =>
        planId === 1 ? 'Starter' : planId === 2 ? 'Growth' : 'Enterprise';

    const filteredCompanies = companies.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-5 sm:p-6 lg:p-8 space-y-5">
            <div>
                <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">Companies</h1>
                <p className="text-[15px] text-muted mt-1">Manage all companies using the platform</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-[14px] text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-[14px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                >
                    <option value="">All status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-3">
                            <Building2 className="text-muted" size={22} strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-medium text-primary">No companies found</p>
                        <p className="text-[14px] text-muted mt-1">Try a different search or filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-border bg-surface-elevated/60">
                                    {['Company', 'Status', 'Plan', 'Users', 'Created', ''].map((h) => (
                                        <th
                                            key={h || 'actions'}
                                            className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wide"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-surface-elevated/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-[14px] font-semibold font-display shrink-0">
                                                    {(company.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-[14px] font-semibold text-primary">{company.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-0.5 border text-xs font-semibold rounded-full capitalize ${
                                                    STATUS_STYLES[company.status] || STATUS_STYLES.active
                                                }`}
                                            >
                                                {company.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-secondary">
                                            {planLabel(company.plan_id)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-[14px] text-secondary">
                                                <Users size={14} className="text-muted" />
                                                <span className="tabular-nums">{company.user_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-secondary">
                                            {new Date(company.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/platform/companies/${company.id}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-inverse text-[14px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                            >
                                                <Eye size={14} />
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
