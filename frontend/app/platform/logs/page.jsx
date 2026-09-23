'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

const PLATFORM_API = '/api/platform';

export default function SystemLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    useEffect(() => {
        fetchLogs();
    }, [days]);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/logs?days=${days}&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('approved')) return 'text-success bg-emerald-50';
        if (action.includes('rejected') || action.includes('suspended')) return 'text-error bg-red-50';
        if (action.includes('created')) return 'text-accent bg-accent-subtle';
        return 'text-secondary bg-surface-elevated';
    };

    return (
        <div className="p-5 sm:p-6 lg:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                        System logs
                    </h1>
                    <p className="text-[15px] text-muted mt-1">Platform admin activity audit trail</p>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-[14px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 self-start"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-3">
                            <Activity className="text-muted" size={22} strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-medium text-primary">No logs found</p>
                        <p className="text-[14px] text-muted mt-1">Try a wider date range</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-border bg-surface-elevated/60">
                                    {['Timestamp', 'Action', 'Performed by', 'IP address'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wide"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-surface-elevated/50 transition-colors">
                                        <td className="px-4 py-3 text-[14px] text-secondary">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getActionColor(
                                                    log.action
                                                )}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-secondary">
                                            {log.performed_by}
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-secondary font-mono">
                                            {log.ip_address || (
                                                <span className="text-muted italic font-sans">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
