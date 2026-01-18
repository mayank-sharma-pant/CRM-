'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Calendar,
    Shield,
    ArrowRight
} from 'lucide-react';

export default function AdminAuditPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('All');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                { id: 1, timestamp: '2024-01-18 10:30', admin: 'Admin', action: 'User approved', entity: 'John Miller', before: 'Pending', after: 'Active' },
                { id: 2, timestamp: '2024-01-18 09:15', admin: 'Admin', action: 'Role changed', entity: 'Lisa Brown', before: 'Sales Executive', after: 'Manager' },
                { id: 3, timestamp: '2024-01-18 08:45', admin: 'Admin', action: 'Team created', entity: 'Sales Delta', before: null, after: 'Created' },
                { id: 4, timestamp: '2024-01-17 17:20', admin: 'Admin', action: 'User deactivated', entity: 'Mark Stevens', before: 'Active', after: 'Inactive' },
                { id: 5, timestamp: '2024-01-17 15:10', admin: 'Admin', action: 'Team shift', entity: 'Alex Johnson', before: 'Sales Bravo', after: 'Sales Alpha' },
                { id: 6, timestamp: '2024-01-17 14:00', admin: 'Admin', action: 'Manager changed', entity: 'Sales Alpha', before: 'James Wilson', after: 'Mike Brown' },
                { id: 7, timestamp: '2024-01-17 11:30', admin: 'Admin', action: 'Invite sent', entity: 'Sarah Chen', before: null, after: 'Pending' },
                { id: 8, timestamp: '2024-01-16 16:45', admin: 'Admin', action: 'User rejected', entity: 'Bob Wilson', before: 'Pending', after: 'Rejected' },
                { id: 9, timestamp: '2024-01-16 14:20', admin: 'Admin', action: 'Settings updated', entity: 'Invoice prefix', before: 'INVOICE', after: 'INV' },
                { id: 10, timestamp: '2024-01-16 10:00', admin: 'System', action: 'User created', entity: 'New Employee', before: null, after: 'Pending' }
            ];
            setLogs(data);
            setLoading(false);
        }, 300);
    }, []);

    const actionTypes = ['All', 'User approved', 'User rejected', 'User deactivated', 'Role changed', 'Team shift', 'Team created', 'Manager changed', 'Invite sent', 'Settings updated'];

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.admin.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    if (loading) return <AuditSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Audit Logs</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track admin actions and changes</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by entity or admin..."
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                </div>

                {/* Action Filter */}
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    {actionTypes.map(action => (
                        <option key={action} value={action}>{action === 'All' ? 'All Actions' : action}</option>
                    ))}
                </select>

                {/* Date Range (placeholder) */}
                <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Calendar size={14} />
                    <span>Last 30 days</span>
                </button>
            </div>

            {/* Audit Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Timestamp</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Admin</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Action</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Entity</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{log.timestamp}</td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-slate-500" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{log.admin}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{log.action}</td>
                                <td className="px-4 py-2.5 font-medium text-sm text-slate-800 dark:text-slate-200">{log.entity}</td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2 text-xs">
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
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400 text-sm">
                        No audit logs found
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-400 text-center">
                Showing {filteredLogs.length} of {logs.length} entries • Read-only
            </p>
        </div>
    );
}

function AuditSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-4 animate-pulse">
            <div className="space-y-1">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-3">
                <div className="h-9 flex-1 max-w-md bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
    );
}
