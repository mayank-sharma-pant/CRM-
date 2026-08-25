'use client';

import Link from 'next/link';
import { Bell, Calendar, Settings2, Sun, Moon, Shield, KeyRound, MessageCircle, MapPin, Mail, Phone, Webhook } from 'lucide-react';
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

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Shield size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Secure your account with an authenticator app.
                </div>
              </div>
            </div>
            <Link
              href="/settings/security"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Shield size={12} />
              Manage Security
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Mail size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Email</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Connect Gmail or Outlook to send and log mail on records.
                </div>
              </div>
            </div>
            <Link
              href="/settings/email"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Mail size={12} />
              Manage mailbox
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Calendar size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Calendar</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Push CRM meetings to Google Calendar or Outlook.
                </div>
              </div>
            </div>
            <Link
              href="/settings/calendar"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Calendar size={12} />
              Manage calendar
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Shield size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Privacy</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Download your data. Admins can export or erase lead and client PII.
                </div>
              </div>
            </div>
            <Link
              href="/settings/privacy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Shield size={12} />
              Privacy
            </Link>
          </div>
        </div>

        {(user?.role === 'admin' || user?.role === 'md') && (
        <>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <KeyRound size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">API keys</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Issue read or write keys for /api/v1/ integrations.
                </div>
              </div>
            </div>
            <Link
              href="/settings/api-keys"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <KeyRound size={12} />
              Manage keys
            </Link>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Webhook size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Outbound webhooks</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Signed HTTPS callbacks for lead, deal, and invoice events.
                </div>
              </div>
            </div>
            <Link
              href="/settings/webhooks"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Webhook size={12} />
              Manage endpoints
            </Link>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Shield size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">SAML SSO</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Company IdP login for existing users.
                </div>
              </div>
            </div>
            <Link
              href="/settings/sso"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Shield size={12} />
              Manage SAML
            </Link>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <MessageCircle size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">WhatsApp</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Gupshup connection and approved message templates.
                </div>
              </div>
            </div>
            <Link
              href="/settings/whatsapp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <MessageCircle size={12} />
              Manage templates
            </Link>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <MapPin size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Territories</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Route leads to teams by service type or source.
                </div>
              </div>
            </div>
            <Link
              href="/settings/territories"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <MapPin size={12} />
              Manage territories
            </Link>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <Phone size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Click-to-call</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Exotel: dial the agent then the customer from a lead or deal.
                </div>
              </div>
            </div>
            <Link
              href="/settings/telephony"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Phone size={12} />
              Manage Exotel
            </Link>
          </div>
        </div>
        </>
        )}

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
