'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../services/api';

export default function LeadEmailPanel({ leadId, leadEmail }) {
  const [items, setItems] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const res = await api.get('/emails', { params: { lead_id: leadId } });
    setItems(res.data.items || []);
  };

  useEffect(() => {
    if (!leadId) return;
    load().catch(() => setItems([]));
  }, [leadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.post('/emails', { lead_id: Number(leadId), subject, body });
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Email</h2>
      <form onSubmit={handleSend} className="space-y-2 mb-4">
        <p className="text-xs text-slate-500">
          To: {leadEmail || 'this lead has no email'}
        </p>
        <label className="block">
          <span className="sr-only">Subject</span>
          <input
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
          />
        </label>
        <label className="block">
          <span className="sr-only">Message</span>
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending || !leadEmail}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50"
        >
          <Mail size={12} />
          {sending ? 'Sending…' : 'Send email'}
        </button>
      </form>
      <div className="space-y-3">
        {items.map((row) => (
          <div key={row.id} className="text-xs">
            <p className="font-medium text-slate-700 dark:text-slate-200">{row.subject}</p>
            <p className="text-slate-500 mt-0.5 whitespace-pre-wrap">{row.body}</p>
            <div className="flex items-center justify-between mt-1 text-slate-400">
              <span>{row.status}</span>
              <span>
                {row.created_at
                  ? (() => {
                      try {
                        return formatDistanceToNow(parseISO(row.created_at), { addSuffix: true });
                      } catch {
                        return row.created_at;
                      }
                    })()
                  : ''}
              </span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">No emails sent yet.</p>
        )}
      </div>
    </div>
  );
}
