'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../services/api';

export default function LeadEmailPanel({ leadId, leadEmail, clientId, dealId, contactEmail, hideHistory, onChanged }) {
  const toAddress = contactEmail || leadEmail;
  const [items, setItems] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mailbox, setMailbox] = useState(null);

  const listParams = () => {
    if (leadId) return { lead_id: leadId };
    if (clientId) return { client_id: clientId };
    if (dealId) return { deal_id: dealId };
    return {};
  };

  const load = async () => {
    if (hideHistory) {
      setItems([]);
      return;
    }
    const res = await api.get('/emails', { params: listParams() });
    setItems(res.data.items || []);
  };

  useEffect(() => {
    if (!leadId && !clientId && !dealId) return;
    load().catch(() => setItems([]));
    api.get('/mailbox').then((res) => setMailbox(res.data)).catch(() => setMailbox(null));
  }, [leadId, clientId, dealId, hideHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const payload = { subject, body };
      if (leadId) payload.lead_id = Number(leadId);
      if (clientId) payload.client_id = Number(clientId);
      if (dealId) payload.deal_id = Number(dealId);
      const dest = toAddress || toEmail.trim();
      if (!leadId && !clientId && dest) payload.to_email = dest;
      await api.post('/emails', payload);
      setSubject('');
      setBody('');
      setToEmail('');
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(toAddress || toEmail.trim());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Email</h2>
      {mailbox && !mailbox.connected && (
        <p className="text-xs text-slate-500 mb-3">
          Sending via company SMTP.{' '}
          <Link href="/settings/email" className="underline">Connect Gmail or Outlook</Link>
          {' '}to send from your mailbox and log replies.
        </p>
      )}
      {mailbox?.connected && (
        <p className="text-xs text-slate-500 mb-3">Sending from {mailbox.email}</p>
      )}
      <form onSubmit={handleSend} className="space-y-2 mb-4">
        <p className="text-xs text-slate-500">
          To: {toAddress || 'enter an address'}
        </p>
        {!toAddress && (
          <label className="block">
            <span className="sr-only">To</span>
            <input
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="to@example.com"
              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
            />
          </label>
        )}
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
          disabled={sending || !canSend}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50"
        >
          <Mail size={12} />
          {sending ? 'Sending…' : 'Send email'}
        </button>
      </form>
      {!hideHistory && <div className="space-y-3">
        {items.map((row) => (
          <div key={row.id} className="text-xs">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {row.direction === 'inbound' ? 'Inbound · ' : ''}
              {row.subject}
            </p>
            <p className="text-slate-500 mt-0.5 whitespace-pre-wrap">{row.body}</p>
            <div className="flex items-center justify-between mt-1 text-slate-400">
              <span>
                {row.status}
                {row.from_email ? ` · ${row.from_email}` : ''}
              </span>
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
          <p className="text-xs text-slate-400 text-center py-2">No emails logged yet.</p>
        )}
      </div>}
    </div>
  );
}
