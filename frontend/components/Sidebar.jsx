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

const ROLE_NAVIGATION = {
    sales: [
        { name: 'Dashboard', href: '/sales/dashboard', icon: 'LayoutDashboard' },
        { name: 'Leads', href: '/sales/leads', icon: 'Users' },
        { name: 'Tasks', href: '/sales/tasks', icon: 'CheckSquare' },
        { name: 'Follow-ups', href: '/sales/follow-ups', icon: 'Calendar' },
        { name: 'Performance', href: '/sales/performance', icon: 'BarChart' },
    ],
    manager: [
        { category: 'OVERVIEW' },
        { name: 'Dashboard', href: '/manager/dashboard', icon: 'LayoutDashboard' },
        { name: 'AI Assistant', href: '/manager/ai-assistant', icon: 'BrainCircuit' },

        { category: 'TEAM' },
        { name: 'Team Monitoring', href: '/manager/monitoring', icon: 'Activity' },
        { name: 'Leads', href: '/manager/leads', icon: 'Users' },
        { name: 'Clients', href: '/manager/clients', icon: 'Briefcase' },
        { name: 'Tasks', href: '/manager/tasks', icon: 'CheckSquare' },
        { name: 'Reports', href: '/manager/reports', icon: 'PieChart' },

        { category: 'FINANCIALS' },
        {
            name: 'Financial Ledgers',
            icon: 'BookOpen',
            children: [
                { name: 'Stock Register', href: '/manager/finance/stock_register' },
                { name: 'Payments Made', href: '/manager/finance/payments_made' },
                { name: 'Payments Received', href: '/manager/finance/payments_received' },
                { name: 'Daily Expenses', href: '/manager/finance/daily_expenses' },
                { name: 'Cash & Bank', href: '/manager/finance/cash_and_bank_balance' },
                { name: 'PDC Given', href: '/manager/finance/pdc_cheque_given' },
                { name: 'PDC Received', href: '/manager/finance/pdc_cheque_received' },
                { name: 'Transfer (Purchase)', href: '/manager/finance/account_transfer_purchase' },
                { name: 'Transfer (Sales)', href: '/manager/finance/account_transfer_sales' },
            ]
        },
    ],
    admin: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
        { name: 'User Management', href: '/admin/users', icon: 'UsersRound' },
        { name: 'Team Management', href: '/admin/teams', icon: 'GitBranch' },
        { name: 'Approvals', href: '/admin/approvals', icon: 'UserCheck' },
        { name: 'Audit Logs', href: '/admin/audit', icon: 'FileText' },
        { name: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ],
    md: [
        { name: 'Dashboard', href: '/md/dashboard', icon: 'LayoutDashboard' },
        { name: 'Revenue', href: '/md/revenue', icon: 'DollarSign' },
        { name: 'Monitoring', href: '/md/monitoring', icon: 'Activity' },
        { name: 'Invoices', href: '/md/invoices', icon: 'Receipt' },
        { name: 'Points', href: '/md/points', icon: 'Award' },
        { name: 'AI Assistant', href: '/md/ai-assistant', icon: 'BrainCircuit' },
    ],
    purchase: [
        { name: 'Dashboard', href: '/purchase/dashboard', icon: 'LayoutDashboard' },
        { name: 'Sales Approvals', href: '/purchase/sales', icon: 'ShoppingCart' },
        { name: 'Invoice Management', href: '/purchase/invoices', icon: 'Receipt' },
        { name: 'Purchase Monitoring', href: '/purchase/monitoring', icon: 'BarChart3' },
    ],
};

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const [navigation, setNavigation] = useState([]);

    // Fetch navigation based on user role
    useEffect(() => {
        const fetchNavigation = async () => {
            if (loading) return;

            // Determine role context from URL if possible (for smoother dev/demo experience)
            let role = user?.role;
            if (pathname.startsWith('/manager')) role = 'manager';
            else if (pathname.startsWith('/admin')) role = 'admin';
            else if (pathname.startsWith('/md')) role = 'md';
            else if (pathname.startsWith('/purchase')) role = 'purchase';
            else if (pathname.startsWith('/sales')) role = 'sales';

            role = role || 'sales'; // Fallback

            const navData = [...(ROLE_NAVIGATION[role] || ROLE_NAVIGATION.sales)];

            // DYNAMICALLY BUILD FINANCE LEDGERS WITH SUB-ITEMS (API-DRIVEN)
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
                    console.warn("Sidebar finance check failed - backend likely unreachable", e);
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
                    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
                        {navigation.map((item, idx) => {
                            // Category Header
                            if (item.category) {
                                return isOpen && (
                                    <div
                                        key={`cat-${idx}`}
                                        className="pt-4 pb-1 px-3 text-[10px] font-bold text-muted uppercase tracking-widest opacity-70"
                                    >
                                        {item.category}
                                    </div>
                                );
                            }

                            const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
                            const Icon = ICON_MAP[item.icon] || Activity;

                            return (
                                <NavItem
                                    key={item.name || `item-${idx}`}
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
            <div className="mb-0.5">
                <button
                    onClick={handleClick}
                    className={`w-full relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-150 group ${isActive && !expanded
                        ? 'bg-accent/10 text-accent'
                        : 'text-secondary hover:bg-surface-elevated hover:text-primary'
                        }`}
                >
                    {isActive && !expanded && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r-full" />
                    )}

                    <Icon
                        size={16}
                        strokeWidth={isActive ? 2 : 1.5}
                        className={`${isActive ? 'text-accent' : 'text-muted group-hover:text-primary'}`}
                    />
                    {isOpen && (
                        <>
                            <span className={`text-[13px] flex-1 text-left ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.name}
                            </span>
                            {/* Chevron */}
                            <svg
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </>
                    )}
                </button>

                {/* Submenu (Refinement) */}
                {isOpen && expanded && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
                        {item.children.map(child => {
                            const isChildActive = pathname === child.href;
                            return (
                                <Link
                                    key={child.name}
                                    href={child.href}
                                    className={`block text-[13px] py-1.5 px-2 rounded-md transition-colors ${isChildActive
                                        ? 'text-accent font-medium bg-accent/10'
                                        : 'text-muted hover:text-primary hover:bg-surface-elevated/50'
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
