'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';

// --- MOCK API ADAPTER ---
const mockApi = {
    getPermissions: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    canSubmit: true,
                });
            }, 300);
        });
    },

    getLeaveHistory: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: 101, type: 'Annual', start: '2025-12-20', end: '2025-12-28', status: 'Approved', days: 8, approver: 'Jane Doe' },
                    { id: 102, type: 'Sick', start: '2025-11-10', end: '2025-11-12', status: 'Approved', days: 2, approver: 'Jane Doe' },
                    { id: 103, type: 'Unpaid', start: '2025-10-05', end: '2025-10-06', status: 'Rejected', days: 1, approver: 'System' },
                ]);
            }, 400);
        });
    },

    submitLeaveRequest: async (data) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        id: Math.floor(Math.random() * 1000),
                        type: data.type,
                        start: data.start,
                        end: data.end,
                        status: 'Pending',
                        days: '—',
                        approver: '—'
                    },
                });
            }, 600);
        });
    },
};

// --- COMPONENTS ---

const LeaveRequestForm = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        type: 'Annual',
        start: '',
        end: '',
        reason: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ type: 'Annual', start: '', end: '', reason: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
                    New Leave Request
                </h2>
            </div>

            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Leave Type</label>
                        <div className="relative">
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-none appearance-none"
                                required
                            >
                                <option value="Annual">Annual Leave</option>
                                <option value="Sick">Sick Leave</option>
                                <option value="Compassionate">Compassionate Leave</option>
                                <option value="Unpaid">Unpaid Leave</option>
                            </select>
                            <ChevronRight className="absolute right-3 top-3 text-slate-400 rotate-90 pointer-events-none" size={14} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Date</label>
                            <input
                                type="date"
                                name="start"
                                value={formData.start}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-none"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Date</label>
                            <input
                                type="date"
                                name="end"
                                value={formData.end}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reason (Optional)</label>
                        <textarea
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            rows={3}
                            placeholder="e.g. Family vacation"
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-none resize-none"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-none flex items-center gap-2"
                        >
                            {isLoading ? 'Processing...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LeaveRequestList = ({ requests }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded border border-emerald-100 dark:border-emerald-800">
                        <CheckCircle size={10} /> Approved
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded border border-rose-100 dark:border-rose-800">
                        <XCircle size={10} /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700">
                        <Clock size={10} /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    Request History
                </h2>
            </div>

            {requests.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="text-slate-300" size={24} />
                    </div>
                    <p className="text-slate-500 text-sm">No leave requests found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-none">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-800 dark:text-slate-200 block">{req.type}</span>
                                        <span className="text-xs text-slate-400 block mt-0.5">ID: #{req.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <span>{req.start}</span>
                                            <span className="text-slate-300">→</span>
                                            <span>{req.end}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(req.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE ---

export default function LeaveRequestsPage() {
    const [permissions, setPermissions] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [perms, hist] = await Promise.all([
                    mockApi.getPermissions(),
                    mockApi.getLeaveHistory(),
                ]);
                setPermissions(perms);
                setHistory(hist);
            } catch (error) {
                console.error("Failed to load leave data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateRequest = async (formData) => {
        setSubmitting(true);
        try {
            const result = await mockApi.submitLeaveRequest(formData);
            if (result.success) {
                setHistory((prev) => [result.data, ...prev]);
                window.scrollTo(0, 0); // Visual feedback since we have no toasts
            }
        } catch (error) {
            console.error('Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="h-full overflow-y-auto bg-slate-50 dark:bg-navy-950">

                {/* Header Section */}
                <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-8 mb-8">
                    <div className="max-w-4xl mx-0"> {/* Strictly left aligned */}
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Leave Management
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">
                            Submit leave requests for administrative approval. Please ensure all dates are correct before submission as this action cannot be undone.
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-8 pb-12">
                    <div className="max-w-4xl mx-0 space-y-8">

                        {loading ? (
                            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
                                Accessing administrative records...
                            </div>
                        ) : (
                            <>
                                {/* Section 1: Form (Conditional) */}
                                {permissions?.canSubmit && (
                                    <LeaveRequestForm onSubmit={handleCreateRequest} isLoading={submitting} />
                                )}

                                {/* Section 2: List (Always Visible) */}
                                <LeaveRequestList requests={history} />
                            </>
                        )}

                    </div>
                </div>
            </div>
        </Layout>
    );
}
