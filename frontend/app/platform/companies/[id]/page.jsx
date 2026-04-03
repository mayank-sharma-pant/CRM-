'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Users, TrendingUp, FileText, CheckCircle2, Ban, ArrowLeft, XCircle } from 'lucide-react';
import RejectCompanyModal from '../../../../components/platform/RejectCompanyModal';

const PLATFORM_API = '/api/platform';

export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchCompanyDetail();
        }
    }, [params.id]);

    const fetchCompanyDetail = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/companies/${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCompany(data);
            }
        } catch (error) {
            console.error('Failed to fetch company:', error);
        } finally {
            setLoading(false);
        }
    };

    const authHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('platform_token')}`,
    });

    const handleStatusChange = async (newStatus) => {
        if (!confirm(`Change company status to ${newStatus}?`)) return;
        setActionBusy(true);
        try {
            const response = await fetch(
                `${PLATFORM_API}/companies/${params.id}/status?new_status=${newStatus}`,
                { method: 'PATCH', headers: authHeaders() }
            );
            if (response.ok) {
                await fetchCompanyDetail();
            } else {
                const d = await response.json().catch(() => ({}));
                alert(d.detail || 'Failed to update status');
            }
        } catch {
            alert('Failed to update status');
        } finally {
            setActionBusy(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm(`Approve "${company?.name}"?`)) return;
        setActionBusy(true);
        try {
            const res = await fetch(`${PLATFORM_API}/companies/${params.id}/approve`, {
                method: 'POST',
                headers: authHeaders(),
            });
            if (res.ok) {
                router.push('/platform/companies');
            } else {
                const d = await res.json().catch(() => ({}));
                alert(d.detail || 'Approve failed');
            }
        } catch {
            alert('Approve failed');
        } finally {
            setActionBusy(false);
        }
    };

    const handleRejectConfirm = async (reason) => {
        setRejectOpen(false);
        setActionBusy(true);
        try {
            const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
            const res = await fetch(`${PLATFORM_API}/companies/${params.id}/reject${q}`, {
                method: 'POST',
                headers: authHeaders(),
            });
            if (res.ok) {
                router.push('/platform/companies');
            } else {
                const d = await res.json().catch(() => ({}));
                alert(d.detail || 'Reject failed');
            }
        } catch {
            alert('Reject failed');
        } finally {
            setActionBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8">
                <p className="text-slate-600">Company not found</p>
            </div>
        );
    }

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-50 text-green-700 border-green-200',
            pending: 'bg-amber-50 text-amber-700 border-amber-200',
            suspended: 'bg-red-50 text-red-700 border-red-200',
            rejected: 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return colors[status] || colors.active;
    };

    return (
        <div className="p-8">
            <RejectCompanyModal
                open={rejectOpen}
                title={`Reject "${company?.name || 'company'}"`}
                onClose={() => setRejectOpen(false)}
                onConfirm={handleRejectConfirm}
            />
            {/* Header */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Companies
            </button>

            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
                </div>
                <span className={`inline-flex px-3 py-1.5 border text-sm font-semibold rounded-lg ${getStatusColor(company.status)}`}>
                    {company.status}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-blue-600" size={24} />
                        <span className="text-sm font-medium text-slate-600">Users</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{company.statistics?.users || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="text-green-600" size={24} />
                        <span className="text-sm font-medium text-slate-600">Leads</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{company.statistics?.leads || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="text-purple-600" size={24} />
                        <span className="text-sm font-medium text-slate-600">Clients</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{company.statistics?.clients || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="text-amber-600" size={24} />
                        <span className="text-sm font-medium text-slate-600">Tasks</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{company.statistics?.tasks || 0}</p>
                </div>
            </div>

            {/* Company Info & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Company Information</h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-slate-600">Plan</p>
                            <p className="font-semibold text-slate-900">
                                {company.plan_id === 1 ? 'Starter' : company.plan_id === 2 ? 'Growth' : 'Enterprise'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Created</p>
                            <p className="font-semibold text-slate-900">
                                {new Date(company.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        {company.approved_at && (
                            <div>
                                <p className="text-sm text-slate-600">Approved</p>
                                <p className="font-semibold text-slate-900">
                                    {new Date(company.approved_at).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Actions</h2>
                    <div className="space-y-3">
                        {company.status === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={handleApprove}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle2 size={20} />
                                    Approve company
                                </button>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => setRejectOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-700 hover:bg-red-50 font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={20} />
                                    Reject
                                </button>
                            </>
                        )}
                        {company.status === 'active' && (
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleStatusChange('suspended')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Ban size={20} />
                                Suspend Company
                            </button>
                        )}
                        {company.status === 'suspended' && (
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleStatusChange('active')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <CheckCircle2 size={20} />
                                Set active
                            </button>
                        )}
                        {company.status === 'rejected' && (
                            <>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => handleStatusChange('pending')}
                                    className="w-full px-4 py-2.5 border-2 border-slate-300 text-slate-800 hover:bg-slate-50 font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Reopen as pending
                                </button>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => handleStatusChange('active')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle2 size={20} />
                                    Activate anyway
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
