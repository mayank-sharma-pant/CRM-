'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistant from './AIAssistant';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const isPublic = ['/', '/login', '/signup'].includes(pathname);

    if (isPublic) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
                <TopBar />
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
            <AIAssistant />
        </div>
    );
}
