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
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
            {/* Shared Sidebar */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>

                {user?.is_sandbox && (
                    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4 shrink-0">
                        Sandbox — changes do not affect production.
                    </div>
                )}

                {/* Admin Top Header */}
                <header className="h-[72px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-primary tracking-tight">
                            Perioxia CRM
                        </h1>
                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">
                            Admin
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Admin Search */}
                        <div className="relative hidden md:block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users, teams..."
                                className="w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all font-medium text-slate-700 dark:text-slate-200"
                            />
                        </div>

                        <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
                            <ThemeToggle />

                            <NotificationDropdown />

                            {/* Profile + Logout dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100 dark:ring-slate-800 cursor-pointer hover:ring-slate-300 transition-all"
                                >
                                    AD
                                </button>
                                {showProfileMenu && (
                                    <div className="absolute right-0 top-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
                                        <button
                                            onClick={() => {
                                                router.push('/profile');
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <User size={14} />
                                            My Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/admin/settings');
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Settings size={14} />
                                            Settings
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <LogOut size={14} />
                                            Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-8 py-7 scroll-smooth" onClick={() => setShowProfileMenu(false)}>
                    {children}
                </main>
            </div>
        </div>
    );
}
