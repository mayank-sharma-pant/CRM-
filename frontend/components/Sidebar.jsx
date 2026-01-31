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
                className={`fixed top-0 left-0 z-30 h-full bg-surface border-r border-border transition-all duration-200 ${isOpen ? 'w-64' : 'w-16'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
                        {isOpen && (
                            <Link
                                href="/"
                                className="text-lg font-semibold text-stone-900 tracking-tight hover:text-accent transition-colors"
                            >
                                LocalCRM
                            </Link>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-md hover:bg-surface-elevated text-stone-500 hover:text-stone-700 transition-colors"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = ICON_MAP[item.icon] || Activity;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${isActive
                                            ? 'bg-stone-100 text-stone-900'
                                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                        }`}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-stone-900 rounded-r" />
                                    )}

                                    <Icon
                                        size={18}
                                        strokeWidth={isActive ? 2 : 1.5}
                                        className={isActive ? 'text-stone-900' : 'text-stone-500'}
                                    />
                                    {isOpen && (
                                        <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-3 border-t border-border shrink-0">
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                        >
                            <Settings size={18} strokeWidth={1.5} className="text-stone-500" />
                            {isOpen && <span className="text-sm">Settings</span>}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
