'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Settings, LogOut, ChevronDown, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SearchDropdown from './SearchDropdown';
import NotificationDropdown from './NotificationDropdown';
import TeamSwitcher from './TeamSwitcher';

const ROLE_LABEL = {
    md: 'Managing Director',
    purchase: 'Purchase',
    manager: 'Manager',
    admin: 'Admin',
    sales: 'Sales',
};

export default function TopBar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const displayName = user?.fullName || user?.full_name || 'Account';
    const initials = displayName.charAt(0).toUpperCase();
    const roleLabel = ROLE_LABEL[user?.role] || null;

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="relative z-40 bg-surface border-b border-border h-14 flex items-center justify-between gap-4 px-4 sm:px-5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {roleLabel && !['sales', 'manager'].includes(user?.role) && (
                    <span className="hidden sm:inline text-[11px] font-medium text-muted shrink-0">
                        {roleLabel}
                    </span>
                )}
                <SearchDropdown />
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <TeamSwitcher className="hidden md:block" />
                <ThemeToggle className="!border-none !bg-transparent hover:!bg-surface-elevated h-8 w-8" />
                <NotificationDropdown />
                <button
                    onClick={() => router.push('/settings')}
                    className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-md transition-colors"
                    aria-label="Settings"
                >
                    <Settings size={16} />
                </button>

                <div className="w-px h-5 bg-border mx-1.5" />

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                        <div className="w-7 h-7 bg-primary text-surface rounded-full flex items-center justify-center font-display text-[12px] font-semibold">
                            {initials}
                        </div>
                        <span className="hidden lg:block text-[13px] font-medium text-primary max-w-[10rem] truncate">
                            {displayName}
                        </span>
                        <ChevronDown size={14} className="text-muted" />
                    </button>

                    {dropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setDropdownOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-md shadow-card z-20">
                                <div className="px-3 py-2.5 border-b border-border">
                                    <p className="text-sm font-medium text-primary truncate">{displayName}</p>
                                    <p className="text-xs text-muted truncate">{user?.email}</p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            router.push('/profile');
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-secondary hover:bg-surface-elevated"
                                    >
                                        <User size={15} className="text-muted" />
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push('/settings/leave');
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-secondary hover:bg-surface-elevated"
                                    >
                                        <Settings size={15} className="text-muted" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-error hover:bg-surface-elevated"
                                    >
                                        <LogOut size={15} />
                                        Sign out
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
