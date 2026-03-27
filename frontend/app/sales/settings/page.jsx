'use client';

import {
  User,
  Lock,
  Settings as SettingsIcon,
  Mail,
  Phone,
  Camera,
  Moon,
  Sun,
  Calendar
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';
import NotificationPreferencesPanel from '../../../components/shared/NotificationPreferencesPanel';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Profile data from authenticated user context (read-only display)
  const profile = {
    name: user?.full_name || '—',
    email: user?.email || '—',
    phone: user?.phone || '—',
    role: user?.role || '—'
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100 pb-12">

      {/* --- HEADER --- */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your personal profile and preferences
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
          Profile and security controls on this page are currently read-only. Notification preferences and theme settings are active.
        </div>

        {/* --- SECTION 1: PROFILE INFORMATION --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <User size={16} className="text-blue-500" />
              Profile Information
            </h2>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-6 mb-8">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 text-2xl font-bold">
                  A
                </div>
                <button
                  type="button"
                  disabled
                  title="Profile photo upload is not connected yet"
                  className="absolute bottom-0 right-0 p-1.5 bg-blue-600/70 rounded-full text-white shadow-sm border-2 border-white dark:border-slate-800 cursor-not-allowed"
                >
                  <Camera size={12} />
                </button>
              </div>
              <div className="pt-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{profile.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white cursor-default"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white cursor-default"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={profile.phone}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white cursor-default"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">Contact your administrator to update profile information.</p>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: SECURITY --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Lock size={16} className="text-slate-400" />
              Security
            </h2>
          </div>

          <div className="p-6">
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
              Password change is currently disabled here. Use the dedicated auth reset flow or contact admin.
            </div>
            <div className="max-w-md space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Password</label>
                <input disabled type="password" placeholder="********" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm opacity-70 cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">New Password</label>
                  <input disabled type="password" placeholder="********" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm opacity-70 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confirm Password</label>
                  <input disabled type="password" placeholder="********" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm opacity-70 cursor-not-allowed" />
                </div>
              </div>

              <div className="pt-2">
                <button disabled className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed">Update Password (Coming Soon)</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- SECTION 3: ADMINISTRATIVE --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              Administrative
            </h2>
          </div>

          <div className="p-6">
            <Link
              href="/settings/leave"
              className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Leave Requests
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit leave requests and view application history
                  </p>
                </div>
              </div>
              <div className="text-slate-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </Link>
          </div>
        </div>

        {/* --- SECTION 3: PREFERENCES --- */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <SettingsIcon size={16} className="text-slate-400" />
              Preferences
            </h2>
          </div>

          <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700/50">

            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Interface Theme</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select your preferred appearance</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <div className="pt-4 mt-2">
              <NotificationPreferencesPanel />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}


