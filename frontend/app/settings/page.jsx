'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  Settings as SettingsIcon,
  Mail,
  Phone,
  Camera,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  // Mock State for Form Interactions (Visual only)
  const [profile, setProfile] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@company.com',
    phone: '+1 (555) 000-0000',
    role: 'Sales Executive' // Read-only
  });

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
                <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white shadow-sm border-2 border-white dark:border-slate-800 hover:bg-blue-700 transition-colors">
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
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                Save Changes
              </button>
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
            <div className="max-w-md space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confirm Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div className="pt-2">
                <button className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
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

            {/* Mock Notification Toggle */}
            <div className="flex items-center justify-between pt-4 mt-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Receive daily summaries of your activity</p>
                </div>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"
                />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
