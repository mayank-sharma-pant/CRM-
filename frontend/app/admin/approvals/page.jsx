'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import {
    UserCheck,
    UserX,
    ChevronRight,
    X,
    Check,
    Search,
    Shuffle,
    MessageSquare
} from 'lucide-react';

export default function AdminApprovalsPage() {
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState([]);
    const [transferRequests, setTransferRequests] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('registrations'); // registrations | transfers

    // Form state for approval
    const [assignedRole, setAssignedRole] = useState('');
    const [assignedTeam, setAssignedTeam] = useState('');
    const [assignedManager, setAssignedManager] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [adminComment, setAdminComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [teams, setTeams] = useState([]);

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const [approvalsRes, transfersRes, teamsRes] = await Promise.all([
                api.get('/admin/approvals'),
                api.get('/admin/transfer-requests?status=pending'),
                api.get('/admin/teams')
            ]);
            setApprovals(approvalsRes.data.approvals || []);
            setTransferRequests(transfersRes.data.requests || []);
            setTeams(teamsRes.data.teams || []);
        } catch (err) {
            console.error('Failed to fetch approvals', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const filteredApprovals = approvals.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApprove = (user) => {
        setSelectedUser(user);
        setAssignedRole(user.requestedRole);
        setAssignedTeam(user.requestedTeam || '');
        setAssignedManager('');
        setShowApproveModal(true);
    };

    const handleReject = (user) => {
        setSelectedUser(user);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmApproval = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            const roleMap = {
                'Sales Executive': 'sales',
                'Manager': 'manager',
                'MD': 'md',
                'Purchase': 'purchase',
                'Admin': 'admin'
            };

            await api.post(`/admin/approvals/${selectedUser.id}/approve`);
            // Also update role and team since the approve endpoint just sets status to active
            await api.put(`/admin/users/${selectedUser.id}`, {
                role: roleMap[assignedRole] || assignedRole.toLowerCase(),
                team_id: assignedTeam || undefined
            });

            fetchApprovals();
            setShowApproveModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error('Approval failed', err);
            alert(err.response?.data?.detail || 'Failed to approve user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmRejection = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            await api.post(`/admin/approvals/${selectedUser.id}/reject`, { reason: rejectionReason });
            fetchApprovals();
            setShowRejectModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error('Rejection failed', err);
            alert(err.response?.data?.detail || 'Failed to reject user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransferAction = (transfer, type) => {
        setSelectedTransfer(transfer);
        setAdminComment('');
        setShowTransferModal(type); // 'approve' or 'reject'
    };

    const confirmTransfer = async (isApproval) => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            const endpoint = isApproval ? 'approve' : 'reject';
            await api.post(`/admin/transfer-requests/${selectedTransfer.id}/${endpoint}`, {
                admin_comment: adminComment
            });
            fetchApprovals();
            setShowTransferModal(false);
            setSelectedTransfer(null);
        } catch (err) {
            console.error('Transfer action failed', err);
            alert(err.response?.data?.detail || `Failed to ${isApproval ? 'approve' : 'reject'} transfer`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <ApprovalsSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">User Approvals</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Approve or reject new member registrations.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">{approvals.length + transferRequests.length} Pending Actions</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('registrations')}
                    className={`px-6 py-3 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'registrations' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    New Registrations ({approvals.length})
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-6 py-3 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'transfers' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Team Transfers ({transferRequests.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Registrations View */}
            {activeTab === 'registrations' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Name</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Contact</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Requested Role</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Submitted</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {filteredApprovals.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{user.name}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="text-slate-700 dark:text-slate-300">{user.email}</div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-[11px] font-medium">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{user.requested_at}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[11px] font-bold uppercase">
                                                Pending
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleApprove(user)}
                                                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                                    title="Approve"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user)}
                                                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                                    title="Reject"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredApprovals.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                            No pending registrations.
                        </div>
                    )}
                </div>
            )}

            {/* Transfers View */}
            {activeTab === 'transfers' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Employee</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">From → To</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Requested By</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Reason</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Submitted</th>
                                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {transferRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-slate-800 dark:text-slate-200">{req.user?.full_name}</div>
                                            <div className="text-[11px] text-slate-500 uppercase font-bold">{req.user?.role}</div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500">{req.current_team?.name || 'N/A'}</span>
                                                <ChevronRight size={12} className="text-slate-300" />
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{req.target_team?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                                            {req.requested_by?.full_name}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="max-w-xs truncate text-slate-600 dark:text-slate-400 italic" title={req.reason}>
                                                "{req.reason}"
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleTransferAction(req, 'approve')}
                                                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                                    title="Approve Transfer"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleTransferAction(req, 'reject')}
                                                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                                    title="Reject Transfer"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {transferRequests.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                            No pending transfer requests.
                        </div>
                    )}
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowApproveModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md" style={{ animation: 'fadeInUp 200ms ease-out forwards' }}>
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-2">Approve User</h3>
                        <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-4">Assign role and team for <strong>{selectedUser.name}</strong></p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                                <select
                                    value={assignedRole}
                                    onChange={(e) => setAssignedRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select role...</option>
                                    <option value="Sales Executive">Sales Executive</option>
                                    <option value="Manager">Manager</option>
                                    <option value="MD">Managing Director</option>
                                    <option value="Purchase">Purchase</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">Team</label>
                                <select
                                    value={assignedTeam}
                                    onChange={(e) => setAssignedTeam(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">No team</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            {assignedRole === 'Sales Executive' && (
                                <div>
                                    <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">Reporting Manager</label>
                                    <select
                                        value={assignedManager}
                                        onChange={(e) => setAssignedManager(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select manager...</option>
                                        <option value="mgr1">James Wilson</option>
                                        <option value="mgr2">Sarah Thompson</option>
                                        <option value="mgr3">Michael Brown</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApproval}
                                disabled={!assignedRole || isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Approving...' : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRejectModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md" style={{ animation: 'fadeInUp 200ms ease-out forwards' }}>
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-2">Reject User</h3>
                        <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-4">Reject registration for <strong>{selectedUser.name}</strong></p>

                        <div className="mb-6">
                            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">Reason (optional)</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                rows={3}
                                placeholder="Enter rejection reason..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRejection}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && selectedTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md" style={{ animation: 'fadeInUp 200ms ease-out forwards' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${showTransferModal === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                <Shuffle size={20} />
                            </div>
                            <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white capitalize">
                                {showTransferModal} Transfer
                            </h3>
                        </div>
                        <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-4">
                            {showTransferModal === 'approve' 
                                ? `Confirming transfer for ${selectedTransfer.user?.full_name} to ${selectedTransfer.target_team?.name}.`
                                : `Rejecting transfer request for ${selectedTransfer.user?.full_name}.`
                            }
                        </p>

                        <div className="mb-6">
                            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">Admin Comment (optional)</label>
                            <textarea
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 ${showTransferModal === 'approve' ? 'focus:ring-emerald-500' : 'focus:ring-red-500'}`}
                                rows={3}
                                placeholder="Enter your comments..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmTransfer(showTransferModal === 'approve')}
                                disabled={isSubmitting}
                                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${showTransferModal === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {isSubmitting ? 'Processing...' : showTransferModal === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ApprovalsSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="h-10 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
