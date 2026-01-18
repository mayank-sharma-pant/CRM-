'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Calendar,
    Search,
    Filter,
    User,
    Users,
    Shield,
    ArrowRight
} from 'lucide-react';

export default function AdminAuditPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('All');
    const [backendSupported, setBackendSupported] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            // Check if backend supports audit (mock)
            const supported = true; // Set to false to show placeholder

            if (supported) {
                const data = [
                    { id: 1, timestamp: '2024-01-15 10:30:45', admin: 'Admin User', action: 'User Approved', entity: 'John Miller', entityType: 'user', before: 'Pending', after: 'Active' },
                    { id: 2, timestamp: '2024-01-15 09:15:22', admin: 'Admin User', action: 'Role Changed', entity: 'Lisa Brown', entityType: 'user', before: 'Sales Executive', after: 'Manager' },
                    { id: 3, timestamp: '2024-01-15 08:45:10', admin: 'Admin User', action: 'Team Created', entity: 'Sales Delta', entityType: 'team', before: null, after: 'Created' },
                    { id: 4, timestamp: '2024-01-14 17:20:33', admin: 'Admin User', action: 'User Deactivated', entity: 'Mark Stevens', entityType: 'user', before: 'Active', after: 'Inactive' },
                    { id: 5, timestamp: '2024-01-14 15:10:18', admin: 'Admin User', action: 'Team Assignment', entity: 'Alex Johnson', entityType: 'user', before: 'Sales Bravo', after: 'Sales Alpha' },
                    { id: 6, timestamp: '2024-01-14 14:00:05', admin: 'Admin User', action: 'Manager Changed', entity: 'Sales Alpha', entityType: 'team', before: 'James Wilson', after: 'Mike Brown' },
                    { id: 7, timestamp: '2024-01-14 11:30:42', admin: 'Admin User', action: 'User Approved', entity: 'Sarah Chen', entityType: 'user', before: 'Pending', after: 'Active' },
                    { id: 8, timestamp: '2024-01-13 16:45:19', admin: 'Admin User', action: 'User Rejected', entity: 'Bob Wilson', entityType: 'user', before: 'Pending', after: 'Rejected' },
                    { id: 9, timestamp: '2024-01-13 14:20:55', admin: 'Admin User', action: 'Role Changed', entity: 'Emily Davis', entityType: 'user', before: 'Manager', after: 'Sales Executive' },
                    { id: 10, timestamp: '2024-01-13 10:00:00', admin: 'System', action: 'User Created', entity: 'New Employee', entityType: 'user', before: null, after: 'Pending' }
                ];
                setLogs(data);
            }
            setBackendSupported(supported);
            setLoading(false);
        }, 400);
    }, []);

    const actionTypes = ['All', 'User Approved', 'User Rejected', 'User Deactivated', 'Role Changed', 'Team Assignment', 'Team Created', 'Manager Changed'];

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.admin.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    if (loading) return <AuditSkeleton />;

    if (!backendSupported) {
        return (
            <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                        <FileText className="text-indigo-500" size={28} />
                        Audit Logs
                    </h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Track admin actions and changes.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-[18px] font-semibold text-slate-700 dark:text-slate-300 mb-2">Audit Logs Not Available</h3>
                    <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Audit logging is not supported in the current backend configuration. Contact system administrator to enable this feature.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                    <FileText className="text-indigo-500" size={28} />
                    Audit Logs
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Track admin actions and changes.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by entity or admin..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Action Filter */}
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {actionTypes.map(action => (
                        <option key={action} value={action}>{action === 'All' ? 'All Actions' : action}</option>
                    ))}
                </select>

                {/* Date Range (placeholder) */}
                <button className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Calendar size={14} />
                    <span>Date Range</span>
                </button>
            </div>

            {/* Audit Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Timestamp</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Admin</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Action</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Entity</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-5 py-3.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">{log.timestamp}</td>
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-indigo-500" />
                                        <span className="text-slate-700 dark:text-slate-300">{log.admin}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <ActionBadge action={log.action} />
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        {log.entityType === 'user' ? (
                                            <User size={14} className="text-blue-500" />
                                        ) : (
                                            <Users size={14} className="text-purple-500" />
                                        )}
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{log.entity}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2 text-[12px]">
                                        {log.before && (
                                            <>
                                                <span className="text-slate-500">{log.before}</span>
                                                <ArrowRight size={12} className="text-slate-400" />
                                            </>
                                        )}
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{log.after}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredLogs.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                        No audit logs found matching your criteria.
                    </div>
                )}
            </div>

            {/* Info */}
            <p className="text-[11px] text-slate-400 text-center">
                Showing {filteredLogs.length} of {logs.length} entries. Audit logs are read-only.
            </p>
        </div>
    );
}

function ActionBadge({ action }) {
    const colors = {
        'User Approved': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'User Rejected': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'User Deactivated': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
        'Role Changed': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'Team Assignment': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Team Created': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        'Manager Changed': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'User Created': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
    };

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${colors[action] || 'bg-slate-100 text-slate-600'}`}>
            {action}
        </span>
    );
}

function AuditSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-4">
                <div className="h-10 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
