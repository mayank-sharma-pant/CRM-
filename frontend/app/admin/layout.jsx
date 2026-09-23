'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout({ children }) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user || user.role !== 'admin') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-page">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-page overflow-hidden">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-200 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
                {user?.is_sandbox && (
                    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4 shrink-0">
                        Sandbox — changes do not affect production.
                    </div>
                )}
                <TopBar />
                <main className="flex-1 overflow-y-auto bg-page px-6 py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
