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
    X,
    ShieldCheck
} from 'lucide-react';

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
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Pending first after dashboard (same priority as mobile CRM platform)
    const navigation = [
        { name: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard, prefix: false },
        { name: 'Pending signups', href: '/platform/requests', icon: FileText, prefix: false },
        { name: 'Companies', href: '/platform/companies', icon: Building2, prefix: true },
        { name: 'Audit log', href: '/platform/logs', icon: Activity, prefix: false },
        { name: 'Plans', href: '/platform/plans', icon: CreditCard, prefix: false },
        { name: 'Platform session', href: '/platform/session', icon: ShieldCheck, prefix: false }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    {sidebarOpen && (
                        <div>
                            <h1 className="text-lg font-bold">Platform Admin</h1>
                            <p className="text-xs text-slate-400">System Control</p>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = item.prefix
                            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                            : pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                <item.icon size={20} />
                                {sidebarOpen && <span className="font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin Info */}
                <div className="p-4 border-t border-slate-700">
                    {sidebarOpen ? (
                        <div className="mb-3">
                            <p className="text-sm font-medium text-white">{admin?.full_name}</p>
                            <p className="text-xs text-slate-400">{admin?.email}</p>
                        </div>
                    ) : null}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
