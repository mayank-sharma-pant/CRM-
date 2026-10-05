'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const { user } = useAuth();
    const isPublic = ['/', '/login', '/signup'].includes(pathname)
        || pathname.startsWith('/platform')
        || pathname.startsWith('/admin')
        || pathname === '/f'
        || pathname.startsWith('/f/')
        || pathname === '/w'
        || pathname.startsWith('/w/')
        || pathname === '/p'
        || pathname.startsWith('/p/')
        || pathname === '/book'
        || pathname.startsWith('/book/')
        || pathname === '/privacy'
        || (pathname === '/settings/security' && !user);

    if (isPublic) {
        return <>{children}</>;
    }

    return (
        <div className="app-desk min-h-screen flex text-primary">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
                {user?.is_sandbox && (
                    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4">
                        Sandbox — changes do not affect production.
                    </div>
                )}
                <TopBar />
                <main className="flex-1 overflow-hidden">
                    <div key={pathname} className="app-page-enter h-full min-h-0 overflow-hidden">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
