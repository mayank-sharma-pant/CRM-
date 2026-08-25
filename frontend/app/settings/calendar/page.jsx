'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Unplug } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function errorCopy(code) {
  if (code === 'denied') return 'Calendar connection was cancelled or denied.';
  if (code === 'provider') return 'That calendar provider is not available.';
  return 'Could not connect calendar.';
}

function isAdminOrMd(role) {
  return role === 'admin' || role === 'md';
}

function CalendarSettingsInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [slug, setSlug] = useState('');
  const [hostId, setHostId] = useState('');
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const canEditBooking = isAdminOrMd(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [calRes, bookRes, usersRes] = await Promise.all([
        api.get('/calendar'),
        api.get('/meetings/booking'),
        api.get('/users'),
      ]);
      setStatus(calRes.data);
      setBooking(bookRes.data);
      setSlug(bookRes.data?.slug || '');
      setHostId(bookRes.data?.host_user_id ? String(bookRes.data.host_user_id) : '');
      setHosts(usersRes.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load calendar status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('calendar') === 'success') {
      setNotice('Calendar connected. New meetings will appear on this calendar.');
    }
    const err = searchParams.get('calendar_error');
    if (err) setError(errorCopy(err));
  }, [searchParams]);

  const connect = (provider) => {
    window.location.href = `/api/calendar/oauth/${provider}/start`;
  };

  const disconnect = async () => {
    setBusy(true);
    setError('');
    try {
      await api.delete('/calendar');
      setNotice('Calendar disconnected.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  const saveBooking = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/meetings/booking', {
        slug: slug.trim() ? slug.trim() : null,
        host_user_id: hostId ? Number(hostId) : null,
      });
      setBooking(res.data);
      setSlug(res.data?.slug || '');
      setHostId(res.data?.host_user_id ? String(res.data.host_user_id) : '');
      setNotice(res.data?.is_live ? 'Booking page is live.' : 'Booking page is not live.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save booking link.');
    } finally {
      setSaving(false);
    }
  };

  const pullEvents = async () => {
    setPulling(true);
    setError('');
    try {
      const res = await api.post('/calendar/sync');
      const created = res.data?.created ?? 0;
      const updated = res.data?.updated ?? 0;
      setNotice(`Pulled events: ${created} created, ${updated} updated.`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not pull calendar events.');
    } finally {
      setPulling(false);
    }
  };

  const publicUrl = booking?.public_path
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${booking.public_path}`
    : '';

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">
            <Link href="/settings" className="hover:underline">Settings</Link>
            {' / Calendar'}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Push CRM meetings to Google Calendar or Outlook. CRM stays the source of truth.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
              {status?.connected ? (
                <>
                  <p className="text-sm text-slate-800 dark:text-slate-100">
                    Connected as <span className="font-semibold">{status.email}</span>
                    {status.provider ? ` (${status.provider})` : ''}
                  </p>
                  {status.status === 'error' && (
                    <p className="text-xs text-red-600">Calendar reported an error. Reconnect and try again.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={pullEvents}
                      disabled={pulling || status.status !== 'active'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                    >
                      Pull events from calendar
                    </button>
                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                    >
                      <Unplug size={12} />
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No calendar connected{user?.email ? ` for ${user.email}` : ''}. Meetings still save in the CRM.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => connect('google')}
                      disabled={!status?.providers?.google}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                    >
                      <Calendar size={12} />
                      Connect Google Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => connect('microsoft')}
                      disabled={!status?.providers?.microsoft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                    >
                      Connect Outlook calendar
                    </button>
                  </div>
                  {!status?.providers?.google && !status?.providers?.microsoft && (
                    <p className="text-xs text-slate-400">
                      Calendar OAuth is not configured. Add Google/Microsoft client credentials and calendar callback URLs.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Booking page</h2>
              {booking?.is_live && publicUrl && (
                <p className="text-xs text-slate-500">
                  Public link:{' '}
                  <a href={booking.public_path} className="underline break-all">{publicUrl}</a>
                </p>
              )}
              {canEditBooking ? (
                <form onSubmit={saveBooking} className="space-y-3">
                  <label className="block text-xs text-slate-500">
                    Slug
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="site-visits"
                      className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1.5"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    Host
                    <select
                      value={hostId}
                      onChange={(e) => setHostId(e.target.value)}
                      className="mt-1 w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1.5"
                    >
                      <option value="">Select a host</option>
                      {hosts.map((h) => (
                        <option key={h.id} value={h.id}>{h.full_name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    Save booking link
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  {booking?.is_live
                    ? `Live as /book/${booking.slug} with ${booking.host_name}.`
                    : 'No booking page is live. Ask an admin to set a slug and host.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <CalendarSettingsInner />
    </Suspense>
  );
}
