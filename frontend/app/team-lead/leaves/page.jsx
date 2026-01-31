'use client';

/**
 * TEAM LEAD LEAVE REQUESTS
 * 
 * Purpose: View/Approve team leave requests.
 * API Driven.
 */

import { useState } from 'react';
import { Calendar, User, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function TeamLeadLeaves() {
    // MOCK DATA - In real implementation, this would fetch from /api/leaves?scope=team
    const [requests, setRequests] = useState([
        { id: 1, user: 'Sarah Miller', type: 'Sick Leave', from: '2024-02-10', to: '2024-02-12', status: 'Pending', reason: 'Flu symptoms' },
        { id: 2, user: 'David Chen', type: 'Casual Leave', from: '2024-02-15', to: '2024-02-16', status: 'Approved', reason: 'Personal work' },
    ]);

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Leave Requests</h1>
                        <p className="text-sm text-slate-500 mt-1">Review and manage team leave applications</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-8 py-8 space-y-4">
                {requests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                            {req.user.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{req.user}</h3>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${req.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {req.status === 'Pending' ? <Clock size={12} /> : <CheckCircle size={12} />}
                                    {req.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span>{req.from} <span className="text-slate-300 mx-1">→</span> {req.to}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-500">Type:</span> {req.type}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 mb-4">
                                "{req.reason}"
                            </div>

                            {req.status === 'Pending' && (
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors">
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 font-medium text-sm transition-colors">
                                        <XCircle size={16} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
