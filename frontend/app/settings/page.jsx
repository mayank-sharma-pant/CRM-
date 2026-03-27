'use client';

import Link from 'next/link';
import { Bell, Calendar, Settings2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPreferencesPanel from '../../components/shared/NotificationPreferencesPanel';

export default function SettingsHomePage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personal preferences for {user?.full_name || user?.email || 'your account'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Settings2 size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Interface Theme</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Switch between light and dark mode.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
            Current mode: {theme === 'dark' ? 'Dark' : 'Light'}
          </div>
        </div>

        <NotificationPreferencesPanel />

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Calendar size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Leave Management</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Submit and track leave requests.
                </div>
              </div>
            </div>
            <Link
              href="/settings/leave"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Bell size={12} />
              Open Leave
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
