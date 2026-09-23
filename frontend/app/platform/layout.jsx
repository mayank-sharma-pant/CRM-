'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Building2,
    FileText,
    CreditCard,
    Activity,
    LogOut,
    Menu,
    PanelLeftClose,
    ShieldCheck,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

const PLATFORM_API = '/api/platform';

export default function PlatformLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const isLoginPage = pathname === '/platform/login';

    useEffect(() => {
        if (isLoginPage) {
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('platform_token');
        if (!token) {
            router.push('/platform/login');
            return;
        }

        fetch(`${PLATFORM_API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then((data) => {
                setAdmin(data);
                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem('platform_token');
                router.push('/platform/login');
            });
    }, [router, isLoginPage]);

    const handleLogout = () => {
        localStorage.removeItem('platform_token');
        router.push('/platform/login');
    };

    if (isLoginPage) {
        return children;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-page flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    const navigation = [
        { name: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard, prefix: false },
        { name: 'Pending signups', href: '/platform/requests', icon: FileText, prefix: false },
        { name: 'Companies', href: '/platform/companies', icon: Building2, prefix: true },
        { name: 'Audit log', href: '/platform/logs', icon: Activity, prefix: false },
        { name: 'Plans', href: '/platform/plans', icon: CreditCard, prefix: false },
        { name: 'Platform session', href: '/platform/session', icon: ShieldCheck, prefix: false },
    ];

    const initials = (admin?.full_name || 'P').charAt(0).toUpperCase();

    return (
        <div className="platform-shell flex text-primary">
            <aside
                className={`platform-sidebar fixed top-0 left-0 z-30 h-full flex flex-col transition-[width] duration-200 ${
                    sidebarOpen ? 'w-60' : 'w-16'
                }`}
            >
                <div
                    className={`flex items-center h-14 shrink-0 border-b border-border ${
                        sidebarOpen ? 'px-3 justify-between' : 'px-2 justify-center'
                    }`}
                >
                    {sidebarOpen && (
                        <Link
                            href="/platform/dashboard"
                            className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
                        >
                            <span className="brand-mark shrink-0">P</span>
                            <div className="min-w-0">
                                <p className="font-display text-[15px] font-semibold tracking-tight truncate text-primary">
                                    Platform
                                </p>
                                <p className="text-[11px] font-medium text-muted tracking-wide uppercase truncate">
                                    Operator
                                </p>
                            </div>
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 rounded-md hover:bg-surface-elevated text-muted hover:text-primary transition-colors"
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {sidebarOpen ? <PanelLeftClose size={16} /> : <Menu size={16} />}
                    </button>
                </div>

                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                    {sidebarOpen && (
                        <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Console
                        </p>
                    )}
                    {navigation.map((item) => {
                        const isActive = item.prefix
                            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                            : pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={!sidebarOpen ? item.name : undefined}
                                className={`platform-nav-item ${isActive ? 'is-active' : ''} ${
                                    !sidebarOpen ? 'justify-center px-0' : ''
                                }`}
                            >
                                <Icon
                                    size={16}
                                    strokeWidth={1.75}
                                    className={isActive ? 'text-accent' : 'text-muted'}
                                />
                                {sidebarOpen && (
                                    <span className="text-[14px]">{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-2 border-t border-border shrink-0 space-y-2">
                    {sidebarOpen ? (
                        <div className="px-1.5 pt-1 space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted px-1">
                                Appearance
                            </p>
                            <ThemeToggle variant="segment" className="w-full justify-between" />
                        </div>
                    ) : (
                        <div className="flex justify-center py-1">
                            <ThemeToggle />
                        </div>
                    )}

                    {sidebarOpen ? (
                        <div className="mx-1 rounded-lg border border-border bg-surface-elevated/60 p-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[12px] font-semibold font-display shrink-0">
                                    {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-primary truncate">
                                        {admin?.full_name || 'Operator'}
                                    </p>
                                    <p className="text-[11px] text-muted truncate">{admin?.email}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-2.5 flex items-center justify-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[13px] font-medium text-secondary hover:bg-surface hover:text-error transition-colors border border-transparent hover:border-border"
                            >
                                <LogOut size={14} strokeWidth={1.75} />
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-1">
                            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[12px] font-semibold font-display">
                                {initials}
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="p-1.5 rounded-md text-secondary hover:bg-surface-elevated hover:text-error"
                                aria-label="Sign out"
                            >
                                <LogOut size={16} strokeWidth={1.75} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <main
                className={`flex-1 min-w-0 transition-[margin] duration-200 ${
                    sidebarOpen ? 'ml-60' : 'ml-16'
                }`}
            >
                {children}
            </main>
        </div>
    );
}
