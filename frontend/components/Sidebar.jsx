'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Calendar,
    PieChart,
    Settings,
    LogOut,
    Briefcase,
    BarChart,
    Activity,
    Receipt,
    CheckSquare,
    BarChart3,
    ShoppingCart,
    DollarSign,
    Award,
    BrainCircuit,
    UserSearch,
    UserCheck,
    UsersRound,
    GitBranch,
    FileText,
    Menu,
    X
} from 'lucide-react';

const ICON_MAP = {
    LayoutDashboard,
    CheckSquare,
    Users,
    BarChart3,
    BarChart,
    Settings,
    Briefcase,
    Activity,
    Receipt,
    Calendar,
    PieChart,
    LogOut,
    ShoppingCart,
    DollarSign,
    Award,
    BrainCircuit,
    UserSearch,
    UserCheck,
    UsersRound,
    GitBranch,
    FileText
};

import { MOCK_DATA } from '../services/mockData';

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const [navigation, setNavigation] = useState([]);

    // Fetch navigation based on current route
    useEffect(() => {
        const fetchNavigation = () => {
            const isManager = pathname?.startsWith('/manager');
            const isMD = pathname?.startsWith('/md');
            const isPurchase = pathname?.startsWith('/purchase');
            const isAdmin = pathname?.startsWith('/admin');
            let role = 'sales';
            if (isManager) role = 'manager';
            if (isMD) role = 'md';
            if (isPurchase) role = 'purchase';
            if (isAdmin) role = 'admin';

            const navData = MOCK_DATA['/navigation'][role] || [];
            setNavigation(navData);
        };
        fetchNavigation();
    }, [pathname]);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-stone-900/20 z-20 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 z-30 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ${isOpen ? 'w-64' : 'w-16'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-[72px] px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        {isOpen && (
                            <Link
                                href="/"
                                className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white tracking-tight hover:opacity-80 transition-opacity"
                            >
                                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white">
                                    <LayoutDashboard size={18} fill="currentColor" className="text-white/20" />
                                </div>
                                <span>LocalCRM</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = ICON_MAP[item.icon] || Activity;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
                                    )}

                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2 : 1.5}
                                        className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
                                    />
                                    {isOpen && (
                                        <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            <Settings size={20} strokeWidth={1.5} className="text-slate-400 dark:text-slate-500" />
                            {isOpen && <span className="text-sm font-medium">Settings</span>}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
