'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
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
    const [daysFilter, setDaysFilter] = useState(30);
    const [error, setError] = useState(null);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ days: daysFilter });
            if (actionFilter !== 'All') {
                params.append('action', actionFilter);
            }

            const response = await api.get(`/admin/audit-log?${params.toString()}`);
            const logsData = (response.data.logs || []).map(log => ({
                id: log.id,
                timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : '–',
                admin: log.admin_name || 'System',
                action: log.action?.replace(/_/g, ' ') || 'Unknown',
                entity: log.entity_name || log.entity_type || '–',
                before: log.before_value ? (typeof log.before_value === 'string' ? log.before_value : JSON.stringify(log.before_value).slice(0, 50)) : null,
                after: log.after_value ? (typeof log.after_value === 'string' ? log.after_value : JSON.stringify(log.after_value).slice(0, 50)) : null
            }));
            setLogs(logsData);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setError('Failed to load audit logs');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [daysFilter, actionFilter]);

    const actionTypes = ['All', 'user_updated', 'user_approved', 'user_rejected', 'user_disabled', 'user_deleted', 'team_created', 'team_updated', 'team_deleted', 'team_member_added', 'team_member_removed', 'invite_created', 'invite_resent', 'invite_cancelled', 'settings_updated'];

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.admin.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
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
                </div>

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
