'use client';

import { useEffect, useState } from 'react';
import api from '../services/api';
import { Send, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PARAMS = {
  model: 'gpt-5.3-codex',
  temperature: 0.2,
  max_output_tokens: 1024,
  max_actions: 5,
};

function isAiProviderMissingError(detail) {
  const s =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((x) => String(x)).join(' ')
        : '';
  return (
    s.includes('No AI provider configured') ||
    s.includes('OPENAI_KEY') ||
    s.includes('GEMINI_API_KEY')
  );
}

export default function AICompanyAssistant({ title = 'Company AI Assistant' }) {
  const { user } = useAuth();
  const canCommand = user?.role === 'md' || user?.role === 'manager';
  const storageKey = user?.id ? `crm.ai.companyAssistant.messages.v1.${user.id}` : null;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask anything about revenue, pipeline, and company status. MD/Manager can also execute team and ledger commands.',
    },
  ]);
  const [paramsMeta, setParamsMeta] = useState(null);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [aiParams, setAiParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const loadParams = async () => {
      try {
        const res = await api.get('/ai/company-assistant/params');
        if (!active) return;
        const data = res.data || {};
        setParamsMeta(data);
        setAiParams({
          model: data?.params?.model || DEFAULT_PARAMS.model,
          temperature: Number(data?.params?.temperature ?? DEFAULT_PARAMS.temperature),
          max_output_tokens: Number(data?.params?.max_output_tokens ?? DEFAULT_PARAMS.max_output_tokens),
          max_actions: Number(data?.params?.max_actions ?? DEFAULT_PARAMS.max_actions),
        });
      } catch (_e) {
        if (!active) return;
        setParamsMeta(null);
      }
    };
    loadParams();
    return () => {
      active = false;
    };
  }, []);

  // Restore chat history per-user (survives refresh + navigation).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setMessages(parsed);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist chat history per-user.
  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    } catch {
      // ignore quota/serialization errors
    }
  }, [storageKey, messages]);

  const canOverrideParams = Boolean(paramsMeta?.can_override);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const recent = [...messages, { role: 'user', text: msg }]
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        // Drop the initial assistant greeting to reduce noise.
        .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
        .slice(-12)
        .map((m) => ({ role: m.role, text: m.text }));

      const payload = {
        message: msg,
        context: {
          role: user?.role || null,
          user_id: user?.id || null,
          recent_messages: recent,
          page_title: title,
        },
      };
      if (canOverrideParams) {
        payload.ai_params = {
          model: aiParams.model,
          temperature: Number(aiParams.temperature),
          max_output_tokens: Number(aiParams.max_output_tokens),
          max_actions: Number(aiParams.max_actions),
        };
      }
      const res = await api.post('/ai/company-assistant', payload);
      const data = res.data;
      const actions = (data.executed_actions || [])
        .map((a) => `${a.action} ${a.result?.id ? `(#${a.result.id})` : ''}`.trim())
        .filter(Boolean);
      const actionText = actions.length ? `\n\nExecuted:\n- ${actions.join('\n- ')}` : '';
      setMessages((m) => [...m, { role: 'assistant', text: `${data.message || 'Done.'}${actionText}` }]);
    } catch (e) {
      const raw = e?.response?.data?.detail;
      const detail =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.map((x) => (typeof x === 'object' && x?.msg ? x.msg : String(x))).join('; ')
            : e?.message || 'Request failed';
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
            <div className="mb-2 space-y-2">
              <div className="text-xs font-bold text-error">{error}</div>
              {isAiProviderMissingError(error) && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-secondary leading-relaxed">
                  <strong className="text-primary">This is a server configuration issue.</strong> OpenAI or Gemini API
                  keys are not set on your <strong>backend</strong> (e.g. AWS / hosting env vars). Add{' '}
                  <code className="rounded bg-surface px-1 py-0.5 text-[11px]">OPENAI_KEY</code> or{' '}
                  <code className="rounded bg-surface px-1 py-0.5 text-[11px]">GEMINI_API_KEY</code>, redeploy or restart
                  the API, then try again. <strong>AI Params</strong> below only changes model and temperature — it
                  cannot supply API keys.
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                canCommand
                  ? 'Try: "Create team Alpha and add an expense entry to daily_expenses"'
                  : 'Try: "What is today revenue and current business snapshot?"'
              }
              className="flex-1 min-h-[44px] max-h-32 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={send}
              disabled={loading}
              className="h-auto p-4 my-2 rounded-full bg-accent text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

