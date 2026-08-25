'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function MarketplaceSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apps, setApps] = useState([]);
  const [busySlug, setBusySlug] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/marketplace/apps');
      setApps(res.data.apps || []);
    } catch (err) {
      setError(formatError(err, 'Could not load marketplace.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const install = async (slug) => {
    setBusySlug(slug);
    try {
      await api.post(`/marketplace/apps/${slug}/install`);
      showToast('Installed', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not install.'), 'error');
    } finally {
      setBusySlug('');
    }
  };

  const uninstall = async (slug) => {
    setBusySlug(slug);
    try {
      await api.delete(`/marketplace/apps/${slug}`);
      showToast('Uninstalled', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not uninstall.'), 'error');
    } finally {
      setBusySlug('');
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-blue-600">
            Settings
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Store size={18} />
            Marketplace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            First-party apps only. Installing bookmarks a feature we already ship — there is no third-party store.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-4">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : apps.length === 0 ? (
          <p className="text-sm text-slate-500">No apps in the catalog.</p>
        ) : (
          apps.map((app) => {
            const installed = app.status === 'installed';
            const busy = busySlug === app.slug;
            return (
              <div
                key={app.slug}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {app.name}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {app.summary}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {installed ? 'Installed' : app.status === 'uninstalled' ? 'Uninstalled' : 'Not installed'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={app.settings_href}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Open settings
                  </Link>
                  {allowed && !installed && (
                    <button
                      type="button"
                      onClick={() => install(app.slug)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Install
                    </button>
                  )}
                  {allowed && installed && (
                    <button
                      type="button"
                      onClick={() => uninstall(app.slug)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                    >
                      Uninstall
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
