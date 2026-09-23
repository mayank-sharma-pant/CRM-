'use client';

import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '', variant = 'icon' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    if (variant === 'segment') {
        return (
            <div
                className={`inline-flex p-0.5 rounded-lg border border-border bg-page ${className}`}
                role="group"
                aria-label="Color theme"
            >
                <button
                    type="button"
                    onClick={() => {
                        if (isDark) toggleTheme();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                        !isDark
                            ? 'bg-surface text-primary shadow-sm border border-border'
                            : 'text-muted hover:text-secondary'
                    }`}
                    aria-pressed={!isDark}
                >
                    <Sun size={13} strokeWidth={2} />
                    Light
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (!isDark) toggleTheme();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                        isDark
                            ? 'bg-surface text-primary shadow-sm border border-border'
                            : 'text-muted hover:text-secondary'
                    }`}
                    aria-pressed={isDark}
                >
                    <Moon size={13} strokeWidth={2} />
                    Dark
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md text-secondary hover:text-primary hover:bg-surface-elevated transition-colors ${className}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            {isDark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
        </button>
    );
}
