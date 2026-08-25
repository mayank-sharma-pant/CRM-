'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Loader2, Phone } from 'lucide-react';
import api from '../../services/api';

function toLocalInput(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function MeetingCallPanel({ parentType, parentId, onChanged, hideHistory }) {
  const parentKey = `${parentType}_id`;
  const [meetings, setMeetings] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput());
  const [location, setLocation] = useState('');

  const [direction, setDirection] = useState('outbound');
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [calendar, setCalendar] = useState(null);
  const [telephony, setTelephony] = useState(null);

  const load = async () => {
    if (!parentId) return;
    if (hideHistory) {
      setLoading(false);
      setMeetings([]);
      setCalls([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = { [parentKey]: parentId };
      const [mRes, cRes] = await Promise.all([
        api.get('/meetings', { params }),
        api.get('/calls', { params }),
      ]);
      setMeetings(mRes.data.items || []);
      setCalls(cRes.data.items || []);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Unable to load meetings and calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get('/calendar').then((res) => setCalendar(res.data)).catch(() => setCalendar(null));
    api.get('/telephony/connection').then((res) => setTelephony(res.data)).catch(() => setTelephony(null));
  }, [parentType, parentId, hideHistory]);

  const refresh = async () => {
    await load();
    if (onChanged) onChanged();
  };

  const handleMeeting = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startsIso = localInputToIso(startsAt);
      if (!startsIso) {
        setError('Enter a valid meeting start time');
        return;
      }
      await api.post('/meetings', {
        subject,
        starts_at: startsIso,
        location: location || null,
        [parentKey]: Number(parentId),
      });
      setSubject('');
      setLocation('');
      setStartsAt(toLocalInput());
      await refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not schedule meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleClickToCall = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/telephony/click-to-call', { [parentKey]: Number(parentId) });
      await refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not place call');
    } finally {
      setSaving(false);
    }
  };

  const handleCall = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        direction,
        outcome: outcome || null,
        notes: callNotes || null,
        [parentKey]: Number(parentId),
      };
      if (duration !== '') {
        payload.duration_seconds = Number(duration);
      }
      await api.post('/calls', payload);
      setOutcome('');
      setCallNotes('');
      setDuration('');
      await refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not log call');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Meetings & calls</h2>

      {!hideHistory && loading && (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Loading activity…
        </p>
      )}

      {error && <p className="text-xs text-red-600">{typeof error === 'string' ? error : 'Something went wrong'}</p>}

      <form onSubmit={handleCall} className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase">Log call</p>
        {telephony?.configured && (
          <button
            type="button"
            onClick={handleClickToCall}
            disabled={saving || !parentId}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
          >
            <Phone size={12} />
            {saving ? 'Calling…' : 'Click to call'}
          </button>
        )}
        <label className="block">
          <span className="sr-only">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className={inputClass}
          >
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Duration in seconds</span>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration (seconds)"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Outcome</span>
          <input
            type="text"
            maxLength={255}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Outcome"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Call notes</span>
          <textarea
            rows={2}
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Notes"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={saving || !parentId}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg disabled:opacity-50"
        >
          <Phone size={12} />
          {saving ? 'Saving…' : 'Log call'}
        </button>
      </form>

      <form onSubmit={handleMeeting} className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase">Schedule meeting</p>
        {calendar && !calendar.connected && (
          <p className="text-xs text-slate-500">
            Saves in CRM only.{' '}
            <Link href="/settings/calendar" className="underline">Connect Google or Outlook</Link>
            {' '}to push site visits to your calendar.
          </p>
        )}
        {calendar?.connected && (
          <p className="text-xs text-slate-500">Also creating an event on {calendar.email}</p>
        )}
        <label className="block">
          <span className="sr-only">Subject</span>
          <input
            type="text"
            required
            maxLength={255}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Start time</span>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Location or meeting URL</span>
          <input
            type="text"
            maxLength={255}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location or URL"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={saving || !parentId}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
        >
          <Calendar size={12} />
          {saving ? 'Saving…' : 'Schedule meeting'}
        </button>
      </form>

      {!hideHistory && !loading && meetings.length === 0 && calls.length === 0 && !error && (
        <p className="text-xs text-slate-400 text-center py-2 italic">No meetings or calls yet.</p>
      )}

      {!hideHistory && !loading && (meetings.length > 0 || calls.length > 0) && (
        <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          {calls.map((c) => (
            <li key={`call-${c.id}`} className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium capitalize">{c.direction} call</span>
              {c.duration_seconds != null ? ` · ${c.duration_seconds}s` : ''}
              {c.outcome ? ` · ${c.outcome}` : ''}
            </li>
          ))}
          {meetings.map((m) => (
            <li key={`meeting-${m.id}`} className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium">{m.subject}</span>
              {` · ${m.status}`}
              {m.calendar_synced ? ' · on calendar' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
