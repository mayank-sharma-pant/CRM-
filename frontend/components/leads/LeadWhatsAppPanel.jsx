'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../services/api';

export default function LeadWhatsAppPanel({ leadId, leadPhone, hideHistory, onChanged }) {
  const [templates, setTemplates] = useState([]);
  const [items, setItems] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionBody, setSessionBody] = useState('');
  const [sessionSending, setSessionSending] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const tpl = await api.get('/whatsapp/templates');
    setTemplates(tpl.data.items || []);
    const msgs = await api.get('/whatsapp/messages', { params: { lead_id: leadId } });
    setSessionOpen(Boolean(msgs.data.session_open));
    if (hideHistory) {
      setItems([]);
      return;
    }
    setItems(msgs.data.items || []);
  };

  useEffect(() => {
    if (!leadId) return;
    load().catch(() => {
      setTemplates([]);
      setItems([]);
    });
  }, [leadId, hideHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.post('/whatsapp/send', {
        lead_id: Number(leadId),
        template_id: Number(templateId),
      });
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send WhatsApp');
    } finally {
      setSending(false);
    }
  };

  const handleSessionSend = async (e) => {
    e.preventDefault();
    setSessionSending(true);
    setError(null);
    try {
      await api.post('/whatsapp/session-send', {
        lead_id: Number(leadId),
        body: sessionBody,
      });
      setSessionBody('');
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send WhatsApp');
    } finally {
      setSessionSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">WhatsApp</h2>
      <form onSubmit={handleSend} className="space-y-2 mb-4">
        <p className="text-xs text-slate-500">
          To: {leadPhone || 'this lead has no phone'}
        </p>
        <label className="block">
          <span className="sr-only">Template</span>
          <select
            required
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-xs text-red-600">{typeof error === 'object' ? JSON.stringify(error) : error}</p>}
        <button
          type="submit"
          disabled={sending || !leadPhone || !templateId}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50"
        >
          <MessageCircle size={12} />
          {sending ? 'Sending…' : 'Send template'}
        </button>
      </form>
      {sessionOpen && (
        <form onSubmit={handleSessionSend} className="space-y-2 mb-4">
          <label className="block">
            <span className="sr-only">Session reply</span>
            <textarea
              required
              value={sessionBody}
              onChange={(e) => setSessionBody(e.target.value)}
              rows={2}
              placeholder="Reply in the 24-hour session window"
              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900"
            />
          </label>
          <button
            type="submit"
            disabled={sessionSending || !leadPhone || !sessionBody.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 text-white text-xs rounded-lg disabled:opacity-50"
          >
            {sessionSending ? 'Sending…' : 'Send session message'}
          </button>
        </form>
      )}
      {!hideHistory && (
      <div className="space-y-3">
        {items.map((row) => (
          <div key={row.id} className="text-xs">
            <p className="font-medium text-slate-700 dark:text-slate-200">{row.to_phone}</p>
            <div className="flex items-center justify-between mt-1 text-slate-400">
              <span>{row.status}{row.error ? ` — ${row.error}` : ''}</span>
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
          <p className="text-xs text-slate-400 text-center py-2">No WhatsApp messages yet.</p>
        )}
      </div>
      )}
    </div>
  );
}
