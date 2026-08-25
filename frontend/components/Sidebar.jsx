'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { financeService } from '../services/financeService';
import {
    LayoutDashboard,
    Users,
    User,
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
    UserSearch,
    UserCheck,
    UsersRound,
    GitBranch,
    FileText,
    BookOpen,
    Bug,
    Target,
    TrendingUp,
    Package,
    ShoppingBag,
    Sparkles,
    Menu,
    X,
    Mail,
    Building2,
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
    UserSearch,
    UserCheck,
    UsersRound,
    GitBranch,
    FileText,
    BookOpen,
    Bug,
    Target,
    TrendingUp,
    Package,
    ShoppingBag,
    Sparkles,
    Mail,
    Building2,
};

const ROLE_NAVIGATION = {
    sales: [
        { name: 'Dashboard', href: '/sales/dashboard', icon: 'LayoutDashboard' },
        { name: 'Leads', href: '/sales/leads', icon: 'Users' },
        { name: 'Clients', href: '/sales/clients', icon: 'Briefcase' },
        { name: 'Accounts', href: '/sales/accounts', icon: 'Building2' },
        { name: 'Deals', href: '/sales/deals', icon: 'Target' },
        { name: 'My Orders', href: '/sales/orders', icon: 'Receipt' },
        { name: 'Stock', href: '/sales/stock', icon: 'Package' },
        { name: 'Products', href: '/sales/products', icon: 'ShoppingBag' },
        { name: 'Tasks', href: '/sales/tasks', icon: 'CheckSquare' },
        { name: 'Follow-ups', href: '/sales/follow-ups', icon: 'Calendar' },
        { name: 'Performance', href: '/sales/performance', icon: 'BarChart' },
        { name: 'Forecast', href: '/reports/forecast', icon: 'TrendingUp' },
        { name: 'AI Assistant', href: '/sales/assistant', icon: 'Sparkles' },
    ],
    manager: [
        { category: 'OVERVIEW' },
        { name: 'Dashboard', href: '/manager/dashboard', icon: 'LayoutDashboard' },

        { category: 'TEAM' },
        { name: 'Team', href: '/manager/team', icon: 'UsersRound' },
        { name: 'Leads', href: '/manager/leads', icon: 'Users' },
        { name: 'Clients', href: '/manager/clients', icon: 'Briefcase' },
        { name: 'Accounts', href: '/manager/accounts', icon: 'Building2' },
        { name: 'Deals', href: '/manager/deals', icon: 'Target' },
        { name: 'Stock', href: '/manager/stock', icon: 'Package' },
        { name: 'Products', href: '/manager/products', icon: 'ShoppingBag' },
        { name: 'Tasks', href: '/manager/tasks', icon: 'CheckSquare' },
        { name: 'Reports', href: '/manager/reports', icon: 'PieChart' },
        { name: 'Saved reports', href: '/reports', icon: 'BarChart3' },
        { name: 'Forecast', href: '/reports/forecast', icon: 'TrendingUp' },
        { name: 'AI Assistant', href: '/manager/assistant', icon: 'Sparkles' },
    ],
    admin: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
        { name: 'User Management', href: '/admin/users', icon: 'UsersRound' },
        { name: 'Team Management', href: '/admin/teams', icon: 'GitBranch' },
        { name: 'Approvals', href: '/admin/approvals', icon: 'UserCheck' },
        { name: 'Audit Logs', href: '/admin/audit', icon: 'FileText' },
        { name: 'Products', href: '/admin/products', icon: 'ShoppingBag' },
        { name: 'Saved reports', href: '/reports', icon: 'BarChart3' },
        { name: 'Forecast', href: '/reports/forecast', icon: 'TrendingUp' },
        { name: 'AI Assistant', href: '/admin/assistant', icon: 'Sparkles' },
        { category: 'SETTINGS' },
        {
            name: 'Settings',
            href: '/settings',
            icon: 'Settings',
            children: [
                { name: 'Email', href: '/settings/email' },
                { name: 'Calendar', href: '/settings/calendar' },
                { name: 'Webhooks', href: '/settings/webhooks' },
                { name: 'SAML SSO', href: '/settings/sso' },
                { name: 'Privacy', href: '/settings/privacy' },
                { name: 'Click-to-call', href: '/settings/telephony' },
                { name: 'Territories', href: '/settings/territories' },
                { name: 'Sandbox', href: '/settings/sandbox' },
            ],
        },
    ],
    md: [
        { name: 'Dashboard', href: '/md/dashboard', icon: 'LayoutDashboard' },
        { name: 'Revenue', href: '/md/revenue', icon: 'DollarSign' },
        { name: 'Teams', href: '/md/teams', icon: 'Users' },
        { name: 'Employee Lookup', href: '/md/employee-lookup', icon: 'UserSearch' },
        { name: 'Leads', href: '/md/leads', icon: 'Target' },
        { name: 'Clients', href: '/md/clients', icon: 'Briefcase' },
        { name: 'Accounts', href: '/md/accounts', icon: 'Building2' },
        { name: 'Deals', href: '/md/deals', icon: 'Target' },
        { name: 'Stock', href: '/md/stock', icon: 'Package' },
        { name: 'Products', href: '/md/products', icon: 'ShoppingBag' },
        { name: 'Invoices', href: '/md/invoices', icon: 'Receipt' },
        { name: 'Saved reports', href: '/reports', icon: 'BarChart3' },
        { name: 'Forecast', href: '/reports/forecast', icon: 'TrendingUp' },
        { name: 'AI Assistant', href: '/md/assistant', icon: 'Sparkles' },
        { category: 'SETTINGS' },
        {
            name: 'Settings',
            href: '/settings',
            icon: 'Settings',
            children: [
                { name: 'Email', href: '/settings/email' },
                { name: 'Calendar', href: '/settings/calendar' },
                { name: 'Webhooks', href: '/settings/webhooks' },
                { name: 'SAML SSO', href: '/settings/sso' },
                { name: 'Privacy', href: '/settings/privacy' },
                { name: 'Click-to-call', href: '/settings/telephony' },
                { name: 'Territories', href: '/settings/territories' },
                { name: 'Sandbox', href: '/settings/sandbox' },
            ],
        },
    ],
    purchase: [
        { name: 'Dashboard', href: '/purchase/dashboard', icon: 'LayoutDashboard' },
        { name: 'Sales Approvals', href: '/purchase/sales', icon: 'ShoppingCart' },
        { name: 'Stock', href: '/purchase/stock', icon: 'Package' },
        { name: 'Products', href: '/purchase/products', icon: 'ShoppingBag' },
        { name: 'Invoice Management', href: '/purchase/invoices', icon: 'Receipt' },
        { name: 'Purchase Monitoring', href: '/purchase/monitoring', icon: 'BarChart3' },
        { name: 'AI Assistant', href: '/purchase/assistant', icon: 'Sparkles' },
    ],
};

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const [navigation, setNavigation] = useState([]);
    const [authorizedLedgers, setAuthorizedLedgers] = useState([]);
    const [ledgerError, setLedgerError] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(true);

    const fetchLedgers = useCallback(async () => {
        setLedgerError(null);
        setLedgerLoading(true);
        try {
            const data = await financeService.getAuthorizedLedgers();
            setAuthorizedLedgers(Array.isArray(data) ? data : []);
        } catch (err) {
            setAuthorizedLedgers([]);
            setLedgerError(err?.response?.data?.detail || err?.message || 'Failed to load ledgers');
        } finally {
            setLedgerLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLedgers();
    }, [fetchLedgers]);

    // Build navigation: role-based nav (dashboard, leads, etc.) + Financial Ledgers from API only
    useEffect(() => {
        if (loading) return;

        let role = user?.role;
        if (pathname.startsWith('/manager')) role = 'manager';
        else if (pathname.startsWith('/admin')) role = 'admin';
        else if (pathname.startsWith('/md')) role = 'md';
        else if (pathname.startsWith('/purchase')) role = 'purchase';
        else if (pathname.startsWith('/sales')) role = 'sales';
        role = role || 'sales';

        const navData = [...(ROLE_NAVIGATION[role] || ROLE_NAVIGATION.sales)];

        if (!ledgerLoading && authorizedLedgers.length > 0) {
            navData.push({
                name: 'Financial Ledgers',
                href: '/financial-ledgers',
                icon: 'BookOpen',
                children: authorizedLedgers.map((l) => ({
                    name: l.name,
                    href: `/financial-ledgers/${(l.slug || '').replace(/_/g, '-')}`
                }))
            });
        }

        // Universal links for all roles
        navData.push({ category: 'SUPPORT' });
        navData.push({ name: 'Report Bug', href: '/report-bug', icon: 'Bug' });

        setNavigation(navData);
    }, [user?.role, loading, pathname, ledgerLoading, authorizedLedgers]);

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
                                <span>Perioxia CRM</span>
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
                        {ledgerError && (
                            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{ledgerError}</p>
                                <button
                                    type="button"
                                    onClick={fetchLedgers}
                                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
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
                    <div className="p-4 border-t border-border shrink-0 space-y-1">
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
