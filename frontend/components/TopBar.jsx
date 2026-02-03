'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
            {/* Left - Search or Branding */}
            {user?.role === 'md' ? (
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-primary tracking-tight">
                        Enterprise Corp
                    </h1>
                    <div className="h-5 w-px bg-border"></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                        Managing Director
                    </span>
                </div>
            ) : user?.role === 'purchase' ? (
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-primary tracking-tight">
                        Enterprise Corp
                    </h1>
                    <div className="h-5 w-px bg-border"></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-success">
                        Purchase Department
                    </span>
                </div>
            ) : (
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-elevated border border-transparent rounded-md focus:border-border focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
                <ThemeToggle className="!border-none !bg-transparent hover:!bg-surface-elevated h-9 w-9" />

                {/* Notifications */}
                <button className="relative p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-md transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full" />
                </button>

                {/* Settings */}
                <button
                    onClick={() => router.push('/settings')}
                    className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-md transition-colors"
                >
                    <Settings size={18} />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-border mx-2" />

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                        <div className="w-8 h-8 bg-surface-elevated text-secondary rounded-full flex items-center justify-center font-medium text-sm">
                            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <ChevronDown size={14} className="text-muted" />
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
                                    <p className="text-sm font-medium text-primary">
                                        {user?.fullName || 'User'}
                                    </p>
                                    <p className="text-xs text-muted truncate">
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
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-secondary hover:bg-surface-elevated transition-colors"
                                    >
                                        <Settings size={16} className="text-muted" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-surface-elevated transition-colors"
                                    >
                                        <LogOut size={16} className="text-error/70" />
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
