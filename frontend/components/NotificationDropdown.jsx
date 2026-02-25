'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import api from '../services/api';

const TYPE_STYLES = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
};

export default function NotificationDropdown() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications', { params: { limit: 10 } });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unread_count || 0);
        } catch {
            // Silently fail — notifications are non-critical
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const markRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { }
    };

    const handleClick = (n) => {
        if (!n.is_read) markRead(n.id);
        if (n.link) {
            router.push(n.link);
            setOpen(false);
        }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                className="relative p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-md transition-colors"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="text-sm font-bold text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                            >
                                <CheckCheck size={12} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell size={24} className="mx-auto text-muted mb-2 opacity-40" />
                                <p className="text-sm text-muted">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated transition-colors border-b border-border/50 last:border-0 ${!n.is_read ? 'bg-accent/5' : ''}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-transparent' : (TYPE_STYLES[n.type] || TYPE_STYLES.info)}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${n.is_read ? 'text-secondary' : 'text-primary font-semibold'}`}>{n.title}</p>
                                        {n.message && <p className="text-xs text-muted truncate mt-0.5">{n.message}</p>}
                                    </div>
                                    <span className="text-[10px] text-muted flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
