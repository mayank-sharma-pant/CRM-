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
        <div className="min-h-screen bg-page flex text-primary">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
                {user?.is_sandbox && (
                    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4">
                        Sandbox — changes do not affect production.
                    </div>
                )}
                <TopBar />
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
