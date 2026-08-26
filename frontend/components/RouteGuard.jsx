'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

/**
 * Role-to-route mapping.
 * Each role is only allowed to access its own section prefix.
 */
const ROLE_ROUTES = {
    sales: '/sales',
    manager: '/manager',
    md: '/md',
    purchase: '/purchase',
    admin: '/admin',
};

const ROLE_DASHBOARDS = {
    sales: '/sales/dashboard',
    manager: '/manager/dashboard',
    md: '/md/dashboard',
    purchase: '/purchase/dashboard',
    admin: '/admin/dashboard',
};

/** Pages that anyone can access (logged in or not) */
const PUBLIC_PATHS = ['/', '/login', '/signup', '/platform', '/accept-invite', '/forgot-password', '/reset-password', '/settings/security', '/privacy'];
const SHARED_PATHS = ['/profile', '/settings', '/finance', '/financial-ledgers', '/report-bug', '/reports', '/campaigns', '/modules', '/cases', '/mass-email'];

function isPublicPath(pathname) {
    if (pathname === '/f' || pathname.startsWith('/f/')) return true;
    if (pathname === '/w' || pathname.startsWith('/w/')) return true;
    if (pathname === '/p' || pathname.startsWith('/p/')) return true;
    if (pathname === '/c' || pathname.startsWith('/c/')) return true;
    if (pathname === '/book' || pathname.startsWith('/book/')) return true;
    return PUBLIC_PATHS.some(p =>
        p === '/' ? pathname === '/' : pathname.startsWith(p)
    );
}

export default function RouteGuard({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        // Allow public paths
        if (isPublicPath(pathname)) return;

        // Shared pages anyone logged-in can access
        if (SHARED_PATHS.some(p => pathname.startsWith(p))) {
            if (!user) {
                router.replace('/login');
            }
            return;
        }

        // Not logged in → redirect to login
        if (!user) {
            router.replace('/login');
            return;
        }

        // Check if user's role matches the route section
        const rolePrefix = ROLE_ROUTES[user.role];
        if (rolePrefix && !pathname.startsWith(rolePrefix)) {
            // User is trying to access a section they don't belong to
            const correctDashboard = ROLE_DASHBOARDS[user.role] || '/login';
            router.replace(correctDashboard);
        }
    }, [user, loading, pathname, router]);

    // Show nothing while checking auth
    // Public pages render immediately so a web-form visitor is not blocked on /auth/me
    if (loading) {
        if (isPublicPath(pathname)) return children;
        return (
            <div className="min-h-screen flex items-center justify-center bg-page">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    // Defensive check: Do not render children if a redirect is imminent
    if (!isPublicPath(pathname)) {
        if (!user) return null; // Waiting for useEffect redirect
        
        if (!SHARED_PATHS.some(p => pathname.startsWith(p))) {
            const rolePrefix = ROLE_ROUTES[user.role];
            if (rolePrefix && !pathname.startsWith(rolePrefix)) {
                return null; // Mismatched role, waiting for useEffect redirect
            }
        }
    }

    return children;
}
