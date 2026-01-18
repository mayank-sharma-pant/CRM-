'use client';

import { useState, useEffect } from 'react';
import {
    UserCheck,
    UserX,
    ChevronRight,
    X,
    Check,
    Search
} from 'lucide-react';

export default function AdminApprovalsPage() {
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state for approval
    const [assignedRole, setAssignedRole] = useState('');
    const [assignedTeam, setAssignedTeam] = useState('');
    const [assignedManager, setAssignedManager] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                { id: 1, name: 'John Miller', email: 'john.miller@example.com', phone: '+1 555-0101', requestedRole: 'Sales Executive', requestedTeam: 'Sales Alpha', submittedAt: '2024-01-15 09:30', status: 'Pending' },
                { id: 2, name: 'Sarah Chen', email: 'sarah.chen@example.com', phone: '+1 555-0102', requestedRole: 'Manager', requestedTeam: null, submittedAt: '2024-01-15 04:15', status: 'Pending' },
                { id: 3, name: 'Mike Johnson', email: 'mike.j@example.com', phone: '+1 555-0103', requestedRole: 'Sales Executive', requestedTeam: 'Sales Bravo', submittedAt: '2024-01-14 14:00', status: 'Pending' },
                { id: 4, name: 'Emily Davis', email: 'emily.d@example.com', phone: '+1 555-0104', requestedRole: 'Sales Executive', requestedTeam: null, submittedAt: '2024-01-14 11:30', status: 'Pending' },
                { id: 5, name: 'Robert Wilson', email: 'r.wilson@example.com', phone: '+1 555-0105', requestedRole: 'Purchase', requestedTeam: null, submittedAt: '2024-01-13 16:45', status: 'Pending' },
                { id: 6, name: 'Lisa Anderson', email: 'l.anderson@example.com', phone: '+1 555-0106', requestedRole: 'Sales Executive', requestedTeam: 'Sales Alpha', submittedAt: '2024-01-13 10:00', status: 'Pending' }
            ];
            setApprovals(data);
            setLoading(false);
        }, 400);
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

    const confirmApproval = () => {
        // Would call backend API here
        setApprovals(approvals.filter(a => a.id !== selectedUser.id));
        setShowApproveModal(false);
        setSelectedUser(null);
    };

    const confirmRejection = () => {
        // Would call backend API here
        setApprovals(approvals.filter(a => a.id !== selectedUser.id));
        setShowRejectModal(false);
        setSelectedUser(null);
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
                    <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">{approvals.length} Pending</span>
                </div>
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

            {/* Approvals Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Name</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Contact</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Requested Role</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Requested Team</th>
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
                                    <div className="text-[11px] text-slate-400">{user.phone}</div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-[11px] font-medium">
                                        {user.requestedRole}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                                    {user.requestedTeam || <span className="text-slate-400">-</span>}
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{user.submittedAt}</td>
                                <td className="px-5 py-3.5">
                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[11px] font-bold uppercase">
                                        {user.status}
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

                {filteredApprovals.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                        No pending approvals.
                    </div>
                )}
            </div>

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
                                    <option value="Sales Alpha">Sales Alpha</option>
                                    <option value="Sales Bravo">Sales Bravo</option>
                                    <option value="Sales Charlie">Sales Charlie</option>
                                    <option value="Enterprise">Enterprise</option>
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
                                disabled={!assignedRole}
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Approve
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
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                                Reject
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
