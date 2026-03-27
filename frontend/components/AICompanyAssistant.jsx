'use client';

import { useEffect, useState } from 'react';
import api from '../services/api';
import { Send, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PARAMS = {
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  max_output_tokens: 1024,
  max_actions: 5,
};

export default function AICompanyAssistant({ title = 'Company AI Assistant' }) {
  const { user } = useAuth();
  const canCommand = user?.role === 'md' || user?.role === 'manager';
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

  const canOverrideParams = Boolean(paramsMeta?.can_override);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const payload = { message: msg };
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
      const usedParams = data?.used_params
        ? `\n\nParams: ${data.used_params.model} | temp ${data.used_params.temperature} | tokens ${data.used_params.max_output_tokens} | actions ${data.used_params.max_actions}`
        : '';
      setMessages((m) => [...m, { role: 'assistant', text: `${data.message || 'Done.'}${actionText}${usedParams}` }]);
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
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setParamsOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-elevated/40"
            >
              <SlidersHorizontal size={14} />
              AI Params
            </button>
          </div>
          {paramsOpen && (
            <div className="mb-3 rounded-md border border-border bg-page p-3 space-y-3">
              {!canOverrideParams && (
                <div className="text-xs text-muted">
                  You can view defaults. Only Admin/MD/Manager can override AI params.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs text-secondary space-y-1 block">
                  <span className="font-semibold">Model</span>
                  <select
                    value={aiParams.model}
                    disabled={!canOverrideParams}
                    onChange={(e) => setAiParams((p) => ({ ...p, model: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary disabled:opacity-70"
                  >
                    {(paramsMeta?.allowed_models || [DEFAULT_PARAMS.model]).map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-secondary space-y-1 block">
                  <span className="font-semibold">Temperature (0-1)</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiParams.temperature}
                    disabled={!canOverrideParams}
                    onChange={(e) => setAiParams((p) => ({ ...p, temperature: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary disabled:opacity-70"
                  />
                </label>
                <label className="text-xs text-secondary space-y-1 block">
                  <span className="font-semibold">Max Output Tokens</span>
                  <input
                    type="number"
                    min="128"
                    max="4096"
                    step="1"
                    value={aiParams.max_output_tokens}
                    disabled={!canOverrideParams}
                    onChange={(e) => setAiParams((p) => ({ ...p, max_output_tokens: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary disabled:opacity-70"
                  />
                </label>
                <label className="text-xs text-secondary space-y-1 block">
                  <span className="font-semibold">Max Actions</span>
                  <input
                    type="number"
                    min="1"
                    max={paramsMeta?.params?.max_actions || 20}
                    step="1"
                    value={aiParams.max_actions}
                    disabled={!canOverrideParams}
                    onChange={(e) => setAiParams((p) => ({ ...p, max_actions: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary disabled:opacity-70"
                  />
                </label>
              </div>
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

