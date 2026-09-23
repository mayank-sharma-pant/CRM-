'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Users, TrendingUp, FileText, CheckCircle2, Ban, ArrowLeft, XCircle } from 'lucide-react';
import RejectCompanyModal from '../../../../components/platform/RejectCompanyModal';

const PLATFORM_API = '/api/platform';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-success border-emerald-100',
    pending: 'bg-amber-50 text-warning border-amber-100',
    suspended: 'bg-red-50 text-error border-red-100',
    rejected: 'bg-surface-elevated text-secondary border-border',
    trial: 'bg-emerald-50 text-success border-emerald-100',
};

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
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setCompany(await response.json());
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8">
                <p className="text-secondary">Company not found</p>
            </div>
        );
    }

    const planLabel =
        company.plan_id === 1 ? 'Starter' : company.plan_id === 2 ? 'Growth' : 'Enterprise';

    const kpis = [
        { label: 'Users', value: company.statistics?.users || 0, icon: Users, tone: 'text-accent bg-accent-subtle' },
        { label: 'Leads', value: company.statistics?.leads || 0, icon: TrendingUp, tone: 'text-success bg-emerald-50' },
        { label: 'Clients', value: company.statistics?.clients || 0, icon: Building2, tone: 'text-info bg-sky-50' },
        { label: 'Tasks', value: company.statistics?.tasks || 0, icon: FileText, tone: 'text-warning bg-amber-50' },
    ];

    return (
        <div className="p-5 sm:p-6 lg:p-8 space-y-5">
            <RejectCompanyModal
                open={rejectOpen}
                title={`Reject "${company?.name || 'company'}"`}
                onClose={() => setRejectOpen(false)}
                onConfirm={handleRejectConfirm}
            />

            <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-[14px] text-secondary hover:text-primary transition-colors"
            >
                <ArrowLeft size={16} />
                Back to companies
            </button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                        {company.name}
                    </h1>
                </div>
                <span
                    className={`inline-flex px-2.5 py-1 border text-[14px] font-semibold rounded-full capitalize ${
                        STATUS_STYLES[company.status] || STATUS_STYLES.active
                    }`}
                >
                    {company.status}
                </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-surface rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[14px] font-medium text-secondary">{kpi.label}</span>
                            <div className={`p-1.5 rounded-lg ${kpi.tone}`}>
                                <kpi.icon size={16} strokeWidth={1.75} />
                            </div>
                        </div>
                        <p className="text-2xl font-semibold text-primary tabular-nums">
                            {kpi.value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-surface rounded-xl border border-border p-5">
                    <h2 className="text-[15px] font-semibold text-primary mb-4">Company information</h2>
                    <div className="space-y-0">
                        {[
                            { label: 'Plan', value: planLabel },
                            { label: 'Created', value: new Date(company.created_at).toLocaleDateString() },
                            company.approved_at
                                ? {
                                      label: 'Approved',
                                      value: new Date(company.approved_at).toLocaleDateString(),
                                  }
                                : null,
                        ]
                            .filter(Boolean)
                            .map((row) => (
                                <div
                                    key={row.label}
                                    className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0"
                                >
                                    <span className="text-[14px] text-secondary">{row.label}</span>
                                    <span className="text-[14px] font-semibold text-primary">{row.value}</span>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="bg-surface rounded-xl border border-border p-5">
                    <h2 className="text-[15px] font-semibold text-primary mb-4">Actions</h2>
                    <div className="space-y-2">
                        {company.status === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={handleApprove}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} />
                                    Approve company
                                </button>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => setRejectOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-error text-[14px] font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={16} />
                                    Reject
                                </button>
                            </>
                        )}
                        {company.status === 'active' && (
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleStatusChange('suspended')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-error text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <Ban size={16} />
                                Suspend company
                            </button>
                        )}
                        {company.status === 'suspended' && (
                            <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleStatusChange('active')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} />
                                Set active
                            </button>
                        )}
                        {company.status === 'rejected' && (
                            <>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => handleStatusChange('pending')}
                                    className="w-full px-4 py-2.5 border border-border text-primary text-[14px] font-medium rounded-lg hover:bg-surface-elevated transition-colors disabled:opacity-50"
                                >
                                    Reopen as pending
                                </button>
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => handleStatusChange('active')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} />
                                    Activate anyway
                                </button>
                            </>
                        )}
                        {!['pending', 'active', 'suspended', 'rejected'].includes(company.status) && (
                            <p className="text-[14px] text-muted">No actions available for this status.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
