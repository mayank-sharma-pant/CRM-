'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import RejectCompanyModal from '../../../components/platform/RejectCompanyModal';

const PLATFORM_API = '/api/platform';

export default function CompanyRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectTarget, setRejectTarget] = useState(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/companies/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setRequests(data.companies || []);
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (companyId, companyName) => {
        if (!companyId) {
            alert('Error: Company ID is missing');
            return;
        }
        if (!confirm(`Approve company "${companyName}"?`)) return;

        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/companies/${companyId}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                alert(`Company "${companyName}" approved successfully`);
                fetchPendingRequests();
            } else {
                const data = await response.json().catch(() => ({}));
                alert(`Failed to approve: ${data.detail || response.statusText}`);
            }
        } catch {
            alert('Network error: Failed to approve company');
        }
    };

    const confirmReject = async (reason) => {
        const companyId = rejectTarget?.id;
        setRejectTarget(null);
        if (!companyId) return;
        try {
            const token = localStorage.getItem('platform_token');
            const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
            const response = await fetch(`${PLATFORM_API}/companies/${companyId}/reject${q}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                fetchPendingRequests();
            } else {
                const data = await response.json().catch(() => ({}));
                alert(`Failed to reject: ${data.detail || response.statusText}`);
            }
        } catch {
            alert('Network error: Failed to reject company');
        }
    };

    const planLabel = (planId) =>
        planId === 1 ? 'Starter' : planId === 2 ? 'Growth' : 'Enterprise';

    return (
        <div className="p-5 sm:p-6 lg:p-8 space-y-5">
            <RejectCompanyModal
                open={!!rejectTarget}
                title={rejectTarget ? `Reject "${rejectTarget.name}"` : 'Reject'}
                onClose={() => setRejectTarget(null)}
                onConfirm={confirmReject}
            />

            <div>
                <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                    Pending signups
                </h1>
                <p className="text-[15px] text-muted mt-1">Review and approve new company signups</p>
            </div>

            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-3">
                            <Clock className="text-muted" size={22} strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-medium text-primary">No pending requests</p>
                        <p className="text-[14px] text-muted mt-1">All caught up</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-border bg-surface-elevated/60">
                                    {['Company', 'Requested', 'Plan', 'Actions', ''].map((h, i) => (
                                        <th
                                            key={`${h}-${i}`}
                                            className={`px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide ${
                                                i >= 3 ? 'text-right' : 'text-left'
                                            }`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-surface-elevated/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                                                    <Building2 size={16} strokeWidth={1.75} />
                                                </div>
                                                <span className="text-[14px] font-semibold text-primary">
                                                    {request.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-secondary">
                                            {new Date(request.requested_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex px-2 py-0.5 bg-accent-subtle text-accent text-xs font-semibold rounded-full">
                                                {planLabel(request.plan_id)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(request.id, request.name)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-success text-white text-[14px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                                >
                                                    <CheckCircle size={14} />
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setRejectTarget({
                                                            id: request.id,
                                                            name: request.name,
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-error text-white text-[14px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                                >
                                                    <XCircle size={14} />
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/platform/companies/${request.id}`}
                                                className="text-[14px] font-medium text-accent hover:text-primary"
                                            >
                                                Open
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
