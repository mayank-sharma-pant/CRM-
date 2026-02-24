'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';

const PLATFORM_API = '/platform';

export default function CompanyRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/companies/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
        if (!confirm(`Approve company "${companyName}"?`)) return;

        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/companies/${companyId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert(`Company "${companyName}" approved successfully`);
                fetchPendingRequests();
            }
        } catch (error) {
            alert('Failed to approve company');
        }
    };

    const handleReject = async (companyId, companyName) => {
        const reason = prompt(`Reject company "${companyName}"?\n\nEnter rejection reason:`);
        if (!reason) return;

        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(
                `${PLATFORM_API}/companies/${companyId}/reject?reason=${encodeURIComponent(reason)}`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                alert(`Company "${companyName}" rejected`);
                fetchPendingRequests();
            }
        } catch (error) {
            alert('Failed to reject company');
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Company Requests</h1>
                <p className="text-slate-600 mt-1">Review and approve new company signups</p>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500 font-medium">No pending requests</p>
                        <p className="text-slate-400 text-sm mt-1">All caught up!</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Domain
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Requested
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                <Building2 className="text-blue-600" size={20} />
                                            </div>
                                            <span className="font-semibold text-slate-900">{request.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {request.domain || <span className="text-slate-400 italic">None</span>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {new Date(request.requested_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                            {request.plan_id === 1 ? 'Starter' : request.plan_id === 2 ? 'Growth' : 'Enterprise'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleApprove(request.id, request.name)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <CheckCircle size={16} />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(request.id, request.name)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
