'use client';

import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Bell } from 'lucide-react';

export default function PurchaseLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
            {/* Shared Sidebar */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">

                {/* Purchase Top Header */}
                <header className="h-[72px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Enterprise Corp
                        </h1>
                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Purchase Department
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-none"></span>
                            <span className="text-[13px] text-slate-500 font-medium">System Online</span>
                        </div>
                        <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-8 py-7 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    );
}
