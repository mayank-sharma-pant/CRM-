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
    Sun,
    Moon
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
    LogOut
};

import { MOCK_DATA } from '../services/mockData';
import { useTheme } from '../contexts/ThemeContext';

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const [navigation, setNavigation] = useState([]);
    const { theme, toggleTheme } = useTheme();

    // BACKEND-DRIVEN NAVIGATION
    // The API determines which modules are visible based on the user's role/context.
    // We simulate this by checking the route prefix to ask for the correct "role" nav.
    useEffect(() => {
        const fetchNavigation = () => {
            const isManager = pathname?.startsWith('/manager');
            const role = isManager ? 'manager' : 'sales';

            // SIMULATE API CALL
            // In real app: const response = await api.get('/navigation');
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
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar - Standard Theme (White/Slate) */}
            <div
                className={`fixed top-0 left-0 z-30 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${isOpen ? 'w-[280px]' : 'w-20'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        {isOpen && (
                            <Link href="/" className="text-2xl font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors cursor-pointer tracking-tight">
                                Local CRM
                            </Link>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = ICON_MAP[item.icon] || Activity;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative group flex items-center px-5 py-3.5 rounded-xl transition-all duration-200 mb-1 ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400' // Active: Light Indigo
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200' // Inactive: Neutral
                                        }`}
                                >
                                    {/* Active Left Indicator Bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] bg-indigo-600 rounded-r-sm"></div>
                                    )}

                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`flex-shrink-0 transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}
                                    />
                                    {isOpen && <span className={`ml-4 text-[15px] ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                    {/* Footer Actions */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
                        <button
                            onClick={toggleTheme}
                            className={`w-full relative group flex items-center px-5 py-3.5 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200`}
                        >
                            {theme === 'dark' ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
                            {isOpen && <span className="ml-4 text-[15px] font-medium tracking-wide">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
