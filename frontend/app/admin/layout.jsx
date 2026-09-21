'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { Search, LogOut, User, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationDropdown from '../../components/NotificationDropdown';

export default function AdminLayout({ children }) {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const handleLogout = () => {
        logout();
    };

    if (loading || !user || user.role !== 'admin') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-page">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-page overflow-hidden">
            {/* Shared Sidebar */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-200 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>

                {user?.is_sandbox && (
                    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4 shrink-0">
                        Sandbox — changes do not affect production.
                    </div>
                )}

                {/* Admin Top Header */}
                <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-5 z-10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="text-[13px] font-medium text-muted">Admin</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="relative hidden md:block mr-2">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users, teams…"
                                className="w-56 pl-8 pr-3 py-1.5 bg-surface-elevated border border-transparent rounded-md text-[13px] placeholder:text-muted focus:outline-none focus:border-border text-primary"
                            />
                        </div>

                        <ThemeToggle className="!border-none !bg-transparent hover:!bg-surface-elevated h-8 w-8" />
                        <NotificationDropdown />

                            <div className="relative ml-1">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="w-7 h-7 rounded-full bg-primary text-surface flex items-center justify-center text-[11px] font-semibold font-display"
                                >
                                    AD
                                </button>
                                {showProfileMenu && (
                                    <div className="absolute right-0 top-9 w-40 bg-surface border border-border rounded-md shadow-card py-1 z-50">
                                        <button
                                            onClick={() => {
                                                router.push('/profile');
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-surface-elevated"
                                        >
                                            <User size={14} />
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/admin/settings');
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-surface-elevated"
                                        >
                                            <Settings size={14} />
                                            Settings
                                        </button>
                                        <div className="h-px bg-border my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-surface-elevated"
                                        >
                                            <LogOut size={14} />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-page px-6 py-6" onClick={() => setShowProfileMenu(false)}>
                    {children}
                </main>
            </div>
        </div>
    );
}
