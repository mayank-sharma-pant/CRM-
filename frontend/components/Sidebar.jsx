'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { financeService } from '../services/financeService';
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
    BookOpen,
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
    FileText,
    BookOpen
};

import { MOCK_DATA } from '../services/mockData';

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const [navigation, setNavigation] = useState([]);

    // Fetch navigation based on user role (PERSISTENT for session)
    useEffect(() => {
        const fetchNavigation = async () => {
            // Do not build navigation until user is loaded
            if (loading) return;

            // Use authenticated role, default to 'sales' if undefined
            // This ensures Managers viewing Finance pages still see Manager sidebar
            const role = user?.role || 'sales';

            const navData = [...(MOCK_DATA['/navigation'][role] || [])];

            // DYNAMICALLY BUILD FINANCE LEDGERS WITH SUB-ITEMS (API-DRIVEN)
            // Only add if not Admin role (Admin has no ledger access)
            if (role !== 'admin') {
                try {
                    const ledgers = await financeService.getAuthorizedLedgers();
                    if (ledgers && ledgers.length > 0) {
                        navData.push({
                            name: 'Financial Ledgers',
                            href: '/finance',
                            icon: 'BookOpen',
                            children: ledgers.map(l => ({
                                name: l.name,
                                href: `/finance/${l.slug}`
                            }))
                        });
                    }
                } catch (e) {
                    console.error("Sidebar finance check failed", e);
                }
            }

            setNavigation(navData);
        };
        fetchNavigation();
    }, [user?.role, loading]);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-primary/20 z-20 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 z-30 h-full bg-surface border-r border-border transition-all duration-200 ${isOpen ? 'w-64' : 'w-16'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-[72px] px-4 border-b border-border shrink-0">
                        {isOpen && (
                            <Link
                                href="/"
                                className="flex items-center gap-2 text-lg font-bold text-primary tracking-tight hover:opacity-80 transition-opacity"
                            >
                                <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-page">
                                    <LayoutDashboard size={18} fill="currentColor" className="text-white/20" />
                                </div>
                                <span>LocalCRM</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-lg hover:bg-surface-elevated text-secondary hover:text-primary transition-colors"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
                            const Icon = ICON_MAP[item.icon] || Activity;
                            const hasChildren = item.children && item.children.length > 0;
                            // Basic expanded state logic (toggle local state if needed, but for simplicity let's auto-expand if active or toggle on click)

                            // We need local state for expansion if we want clickable toggles.
                            // But inside map is cleaner if we extract a NavItem component.
                            // For this single-file edit, let's create a functional rendering block.

                            return (
                                <NavItem
                                    key={item.name}
                                    item={item}
                                    isActive={isActive}
                                    Icon={Icon}
                                    isOpen={isOpen}
                                    pathname={pathname}
                                />
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-border shrink-0">
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-elevated hover:text-primary transition-colors"
                        >
                            <Settings size={20} strokeWidth={1.5} className="text-muted" />
                            {isOpen && <span className="text-sm font-medium">Settings</span>}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

// Sub-component for individual items to handle toggle state cleanly
function NavItem({ item, isActive, Icon, isOpen, pathname }) {
    const [expanded, setExpanded] = useState(isActive);
    const hasChildren = item.children && item.children.length > 0;

    // Auto-expand if a child is active
    useEffect(() => {
        if (isActive && hasChildren) {
            setExpanded(true);
        }
    }, [isActive, hasChildren]);

    const handleClick = (e) => {
        if (hasChildren) {
            e.preventDefault(); // Prevent navigation if it has children, just toggle
            if (isOpen) setExpanded(!expanded);
        }
    };

    if (hasChildren) {
        return (
            <div className="mb-1">
                <button
                    onClick={handleClick}
                    className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive && !expanded
                        ? 'bg-accent/10 text-accent'
                        : 'text-secondary hover:bg-surface-elevated hover:text-primary'
                        }`}
                >
                    {isActive && !expanded && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                    )}

                    <Icon
                        size={20}
                        strokeWidth={isActive ? 2 : 1.5}
                        className={`${isActive ? 'text-accent' : 'text-muted group-hover:text-primary'}`}
                    />
                    {isOpen && (
                        <>
                            <span className={`text-sm flex-1 text-left ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.name}
                            </span>
                            {/* Chevron */}
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </>
                    )}
                </button>

                {/* Submenu */}
                {isOpen && expanded && (
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-border space-y-1">
                        {item.children.map(child => {
                            const isChildActive = pathname === child.href;
                            return (
                                <Link
                                    key={child.name}
                                    href={child.href}
                                    className={`block text-sm py-2 px-2 rounded-md transition-colors ${isChildActive
                                        ? 'text-accent font-medium bg-accent/10'
                                        : 'text-muted hover:text-primary'
                                        }`}
                                >
                                    {child.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-accent/10 text-accent'
                : 'text-secondary hover:bg-surface-elevated hover:text-primary'
                }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
            )}

            <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                className={`${isActive ? 'text-accent' : 'text-muted group-hover:text-primary'}`}
            />
            {isOpen && (
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.name}
                </span>
            )}
        </Link>
    );
}
