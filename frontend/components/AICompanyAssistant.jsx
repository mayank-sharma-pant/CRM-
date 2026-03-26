'use client';

import { useState } from 'react';
import api from '../services/api';
import { Send, Loader2, Sparkles } from 'lucide-react';

export default function AICompanyAssistant({ title = 'Company AI Assistant' }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Tell me what you want to do. Example: "Create team Alpha with best sales executive from last month and a manager."',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/company-assistant', { message: msg });
      const data = res.data;
      const actions = (data.executed_actions || [])
        .map((a) => `${a.action} ${a.result?.id ? `(#${a.result.id})` : ''}`.trim())
        .filter(Boolean);
      const actionText = actions.length ? `\n\nExecuted:\n- ${actions.join('\n- ')}` : '';
      setMessages((m) => [...m, { role: 'assistant', text: `${data.message || 'Done.'}${actionText}` }]);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Request failed';
      setError(detail);
      setMessages((m) => [...m, { role: 'assistant', text: `I couldn't run that: ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl w-full space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-accent" size={18} />
        <h1 className="text-lg font-bold text-primary">{title}</h1>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-md border text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-surface-elevated/30 border-border text-primary'
                  : 'bg-page border-border/60 text-secondary'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">
                {m.role === 'user' ? 'You' : 'AI'}
              </div>
              {m.text}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          {error && (
            <div className="mb-2 text-xs font-bold text-error">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Find best sales executive for 2026-02 and create team Alpha"'
              className="flex-1 min-h-[44px] max-h-32 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={send}
              disabled={loading}
              className="h-[44px] px-3 rounded-md bg-accent text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

