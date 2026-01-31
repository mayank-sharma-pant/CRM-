'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function TopBar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="bg-surface border-b border-border h-14 flex items-center justify-between px-6">
            {/* Left - Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-surface-elevated border border-transparent rounded-md focus:border-stone-300 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <button className="relative p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                {/* Settings */}
                <button
                    onClick={() => router.push('/settings')}
                    className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                >
                    <Settings size={18} />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-border mx-2" />

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-stone-100 transition-colors"
                    >
                        <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center text-stone-600 font-medium text-sm">
                            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <ChevronDown size={14} className="text-stone-400" />
                    </button>

                    {dropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setDropdownOpen(false)}
                            />

                            {/* Dropdown */}
                            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-md shadow-card z-20">
                                {/* User info */}
                                <div className="px-4 py-3 border-b border-border">
                                    <p className="text-sm font-medium text-stone-900">
                                        {user?.fullName || 'User'}
                                    </p>
                                    <p className="text-xs text-stone-500 truncate">
                                        {user?.email}
                                    </p>
                                </div>

                                {/* Menu items */}
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            router.push('/settings');
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                    >
                                        <Settings size={16} className="text-stone-400" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-stone-50 transition-colors"
                                    >
                                        <LogOut size={16} className="text-red-400" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
