'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import api, { getActiveTeamId } from '../services/api';
import { Send, Loader2, Sparkles, Brain, CheckCircle2, Circle, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PARAMS = {
  model: 'gpt-5.3-codex',
  temperature: 0.2,
  max_output_tokens: 1024,
  max_actions: 5,
};

const AGENT_PHASES = [
  { key: 'understand', label: 'Understanding your request' },
  { key: 'model', label: 'Calling AI to plan tools and parameters' },
  { key: 'run', label: 'Executing and validating actions' },
];

/** Display names instead of snake_case action ids */
const TOOL_DISPLAY_NAMES = {
  business_snapshot: 'Company snapshot',
  revenue_summary: 'Revenue summary',
  team_performance_summary: 'Team performance',
  monthly_best_sales_exec: 'Best sales executive (month)',
  get_best_manager: 'Best manager (month)',
  create_team: 'Create team',
  create_team_with_members: 'Create team with members',
  create_top_performing_team: 'Top performers team',
  create_ledger_entry: 'Ledger entry',
  create_task: 'Create task',
  add_team_member: 'Add team member',
  remove_team_member: 'Remove team member',
  delete_team: 'Delete team',
  list_teams: 'List teams',
  list_company_users: 'List company users',
  list_tasks: 'List tasks',
  update_task: 'Update task',
  complete_task: 'Complete task',
  delete_task: 'Delete task',
};

function fmtNum(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/**
 * Plain-language lines for known CRM tools. Returns null → caller may show a generic fallback.
 */
function summarizeToolResult(actionName, params, result) {
  if (result == null || typeof result !== 'object') return null;

  if (result.status === 'skipped' || result.ok === false) return null;

  const p = params && typeof params === 'object' ? params : {};

  switch (actionName) {
    case 'business_snapshot': {
      const leads = pick(result, 'leads', 'Leads') || {};
      const tasks = pick(result, 'tasks', 'Tasks') || {};
      const inv = pick(result, 'invoices', 'Invoices') || {};
      const teams = pick(result, 'teams', 'Teams');
      const lines = [
        `Leads: ${fmtNum(leads.total)} total — ${fmtNum(leads.converted)} won, ${fmtNum(leads.lost)} lost, ${fmtNum(leads.active)} still active.`,
      ];
      if (tasks.open != null || tasks.completed != null) {
        lines.push(`Tasks: ${fmtNum(tasks.open)} open, ${fmtNum(tasks.completed)} completed.`);
      }
      if (inv && (inv.paid_revenue != null || inv.billed_revenue != null || inv.total != null)) {
        lines.push(
          `Invoices: ${fmtNum(inv.total)} records — paid ${fmtNum(inv.paid_revenue)}, billed ${fmtNum(inv.billed_revenue)}, overdue ${fmtNum(inv.overdue_revenue)}.`,
        );
      }
      if (inv?.pending != null) lines.push(`${fmtNum(inv.pending)} invoice(s) pending or overdue.`);
      if (teams != null) lines.push(`Teams in company: ${fmtNum(teams)}.`);
      return { lines };
    }
    case 'revenue_summary': {
      const period = p.period || result.period || 'period';
      const label = result.period_label || '';
      const lines = [
        `${period.charAt(0).toUpperCase() + period.slice(1)}${label ? ` (${label})` : ''}: ${fmtNum(result.invoice_count)} invoices.`,
        `Billed ${fmtNum(result.billed_revenue)}, collected (paid) ${fmtNum(result.paid_revenue)}, pending ${fmtNum(result.pending_revenue)}, overdue ${fmtNum(result.overdue_revenue)}.`,
      ];
      return { lines };
    }
    case 'monthly_best_sales_exec': {
      const top = result.top_sales_exec;
      if (!top) {
        return { lines: ['No sales users or no activity recorded for that month — nobody to rank yet.'] };
      }
      return {
        lines: [
          `Top seller: ${top.name || 'Unknown'} — paid revenue ${fmtNum(top.revenue)}, ${fmtNum(top.converted_leads)} conversions in period.`,
        ],
      };
    }
    case 'get_best_manager': {
      const tm = result.top_manager;
      if (tm == null) {
        return {
          lines: [
            'There are no users with the manager role in this company, so nobody can be ranked as “best manager” yet. Add at least one manager, then ask again.',
          ],
        };
      }
      if (typeof tm === 'string') {
        return { lines: [`Standout manager (by team revenue attribution): ${tm}.`] };
      }
      return {
        lines: [
          `Standout manager: ${tm.name || 'Unknown'} — attributed paid revenue from their teams: ${fmtNum(tm.revenue)}.`,
        ],
      };
    }
    case 'team_performance_summary': {
      if (result.member_stats == null && result.teams_managed == null) return null;
      const names = result.teams_managed;
      const lines = [];
      if (Array.isArray(names) && names.length) {
        lines.push(`Teams you’re on: ${names.join(', ')} (${result.period_examined || p.period || 'month'} window).`);
      }
      lines.push(
        `Combined: ${fmtNum(result.total_converted_leads)} leads converted, ${fmtNum(result.total_completed_tasks)} tasks completed, ${fmtNum(result.total_revenue_generated)} paid revenue.`,
      );
      const stats = result.member_stats;
      if (Array.isArray(stats) && stats.length) {
        const top = [...stats].sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0)).slice(0, 3);
        lines.push(
          `Top contributors: ${top.map((s) => `${s.name} (${fmtNum(s.revenue)})`).join(' · ')}.`,
        );
      }
      return { lines };
    }
    case 'create_team': {
      const t = result.team || result;
      if (t?.name || t?.id) {
        return { lines: [`Team “${t.name || 'New team'}” created${t.id ? ` (id ${t.id})` : ''}.`] };
      }
      return null;
    }
    case 'create_team_with_members': {
      const team = result.team;
      const added = result.members_added;
      const skipped = result.members_skipped;
      const lines = [];
      if (team?.name) lines.push(`Team “${team.name}” is set up.`);
      if (Array.isArray(added)) lines.push(`${added.length} member(s) added.`);
      if (Array.isArray(skipped) && skipped.length) {
        lines.push(`${skipped.length} could not be added (wrong role, missing user, or duplicate).`);
      }
      return lines.length ? { lines } : null;
    }
    case 'create_top_performing_team': {
      if (result.team) {
        const added = result.members_added;
        const n = Array.isArray(added) ? added.length : 0;
        return {
          lines: [
            `Team “${result.team.name || 'New team'}” created with ${n} top performer(s) plus the assigned lead.`,
          ],
        };
      }
      return null;
    }
    case 'create_ledger_entry': {
      if (result.ledger_slug || result.id) {
        return {
          lines: [`Recorded in ledger “${result.ledger_slug || 'ledger'}”${result.id ? ` (entry #${result.id})` : ''}.`],
        };
      }
      return null;
    }
    case 'create_task': {
      if (result.id || result.title) {
        return { lines: [`Task created${result.title ? `: “${result.title}”` : ''}${result.id ? ` (#${result.id})` : ''}.`] };
      }
      return null;
    }
    case 'list_teams': {
      const teams = result.teams;
      if (!Array.isArray(teams)) return null;
      const preview = teams
        .slice(0, 5)
        .map((t) => (t && t.name ? `“${t.name}” (#${t.id})` : `#${t?.id}`))
        .join(', ');
      return {
        lines: [
          `${teams.length} team(s)${preview ? `: ${preview}` : ''}${teams.length > 5 ? ' …' : ''}.`,
        ],
      };
    }
    case 'list_company_users': {
      const users = result.users;
      if (!Array.isArray(users)) return null;
      const preview = users
        .slice(0, 5)
        .map((u) => (u && u.full_name ? `${u.full_name} (#${u.id})` : `#${u?.id}`))
        .join(', ');
      return {
        lines: [
          `${users.length} user(s)${preview ? `: ${preview}` : ''}${users.length > 5 ? ' …' : ''}.`,
        ],
      };
    }
    case 'list_tasks': {
      const tasks = result.tasks;
      if (!Array.isArray(tasks)) return null;
      const preview = tasks
        .slice(0, 4)
        .map((t) => (t && t.title ? `“${t.title}” (#${t.id})` : `#${t?.id}`))
        .join(', ');
      return {
        lines: [
          `${tasks.length} task(s)${preview ? `: ${preview}` : ''}${tasks.length > 4 ? ' …' : ''}.`,
        ],
      };
    }
    case 'complete_task': {
      if (result.task_id != null) {
        return { lines: [`Task #${result.task_id} completed.`] };
      }
      return null;
    }
    case 'update_task': {
      if (result.task_id != null && result.updated) {
        return { lines: [`Task #${result.task_id} updated.`] };
      }
      return null;
    }
    case 'delete_task': {
      if (result.deleted_task_id != null) {
        return { lines: [`Task #${result.deleted_task_id} deleted.`] };
      }
      return null;
    }
    default:
      return null;
  }
}

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

function normalizeStoredMessages(parsed) {
  if (!Array.isArray(parsed)) return null;
  return parsed.map((m) => {
    if (!m || typeof m !== 'object') return m;
    if (m.role === 'user' || m.role === 'assistant') {
      return {
        role: m.role,
        text: typeof m.text === 'string' ? m.text : '',
        reasoning: typeof m.reasoning === 'string' ? m.reasoning : m.reasoning || null,
        executedActions: Array.isArray(m.executedActions) ? m.executedActions : [],
      };
    }
    return m;
  });
}

function recentForApi(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
    .slice(-12)
    .map((m) => ({ role: m.role, text: m.text }));
}

function AgentProcessingCard({ phase }) {
  const phaseLabel = AGENT_PHASES[Math.min(phase, AGENT_PHASES.length - 1)]?.label ?? '';
  return (
    <div className="rounded-md border border-accent/25 bg-accent/5 p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-primary">
        <Loader2 className="animate-spin text-accent shrink-0" size={16} aria-hidden />
        <span>Working on your request</span>
        <span className="text-xs font-medium text-muted w-full sm:w-auto sm:ml-1">
          ({phase + 1}/{AGENT_PHASES.length}) {phaseLabel}
        </span>
      </div>
      <p className="text-[11px] text-muted leading-snug">
        The server is calling the AI and may run tools. This usually takes a few seconds; you can keep typing your next idea below once the reply appears.
      </p>
      <ul className="space-y-2.5 text-xs text-secondary">
        {AGENT_PHASES.map((p, i) => {
          const done = i < phase;
          const active = i === phase;
          return (
            <li key={p.key} className="flex items-start gap-2.5">
              {done ? (
                <CheckCircle2 className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" size={15} aria-hidden />
              ) : active ? (
                <Loader2 className="animate-spin text-accent shrink-0 mt-0.5" size={15} aria-hidden />
              ) : (
                <Circle className="text-muted/50 shrink-0 mt-0.5" size={15} aria-hidden />
              )}
              <span className={active ? 'text-primary font-medium' : done ? 'text-secondary' : 'text-muted'}>
                {p.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function toolOutcome(result) {
  if (result == null || typeof result !== 'object') {
    return { tone: 'neutral', badge: null, headline: null, hint: null };
  }
  if (result.status === 'skipped') {
    return {
      tone: 'warning',
      badge: 'skipped',
      headline: 'This action was not executed for your account.',
      hint: typeof result.reason === 'string' ? result.reason.replace(/_/g, ' ') : null,
    };
  }
  if (result.ok === false) {
    return {
      tone: 'error',
      badge: 'not completed',
      headline: typeof result.summary === 'string' ? result.summary : 'The action could not complete as requested.',
      hint: typeof result.suggestion === 'string' ? result.suggestion : null,
    };
  }
  const blocked = ['no_sales_executives', 'no_teams_found', 'no_members_found'];
  if (result.status && blocked.includes(result.status)) {
    return {
      tone: 'error',
      badge: 'blocked',
      headline: typeof result.summary === 'string' ? result.summary : `Status: ${result.status}`,
      hint: typeof result.suggestion === 'string' ? result.suggestion : null,
    };
  }
  const looksOk =
    result.team != null ||
    result.id != null ||
    (Array.isArray(result.members_added) && result.members_added.length > 0) ||
    result.top_sales_exec != null ||
    result.ledger_slug != null ||
    result.leads != null ||
    result.Leads != null ||
    result.tasks != null ||
    Array.isArray(result.teams) ||
    Array.isArray(result.users) ||
    result.invoices != null ||
    result.Invoices != null ||
    (result.period != null && result.billed_revenue !== undefined) ||
    result.member_stats != null ||
    result.teams_managed != null ||
    result.top_manager !== undefined ||
    result.deleted_task_id != null ||
    result.deleted_task_id != null ||
    result.updated === true ||
    (result.task_id != null && result.status != null && result.ok !== false);
  if (looksOk || (result.status == null && result.ok !== false)) {
    return { tone: 'success', badge: 'done', headline: null, hint: null };
  }
  return { tone: 'neutral', badge: null, headline: null, hint: null };
}

function ToolRunBlock({ action }) {
  const { action: name, params, result } = action;
  const outcome = toolOutcome(result);
  const skipped = outcome.tone === 'warning';
  const issue = outcome.tone === 'error';
  const borderClass = issue
    ? 'border-red-500/35 bg-red-500/5'
    : skipped
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-border bg-surface/80';

  const displayName = TOOL_DISPLAY_NAMES[name] || name.replace(/_/g, ' ');
  const friendly = !issue && !skipped ? summarizeToolResult(name, params, result) : null;
  const paramKeys = params && typeof params === 'object' ? Object.keys(params).filter((k) => params[k] != null) : [];
  const paramLine =
    paramKeys.length > 0
      ? paramKeys.map((k) => `${k}: ${typeof params[k] === 'object' ? JSON.stringify(params[k]) : String(params[k])}`).join(' · ')
      : null;

  return (
    <div className={`rounded-md border text-left overflow-hidden ${borderClass}`}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60 bg-surface-elevated/40">
        <Wrench size={13} className="text-muted shrink-0" aria-hidden />
        <span className="text-[13px] font-semibold text-primary">{displayName}</span>
        <code className="text-[10px] text-muted font-mono hidden sm:inline">({name})</code>
        {outcome.badge ? (
          <span
            className={`text-[10px] font-semibold uppercase ml-auto ${
              issue
                ? 'text-red-600 dark:text-red-400'
                : skipped
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {outcome.badge}
          </span>
        ) : null}
      </div>

      {(outcome.headline || outcome.hint) && (
        <div
          className={`px-3 py-2.5 text-xs leading-relaxed border-b border-border/50 ${
            issue ? 'bg-red-500/10 text-primary' : 'bg-amber-500/10 text-primary'
          }`}
        >
          {outcome.headline ? <p className="font-semibold">{outcome.headline}</p> : null}
          {outcome.hint ? <p className="text-secondary mt-1">{outcome.hint}</p> : null}
        </div>
      )}

      {!issue && !skipped && friendly?.lines?.length ? (
        <ul className="px-3 py-2.5 text-sm text-primary leading-relaxed space-y-1.5 list-disc list-inside marker:text-accent">
          {friendly.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : !issue && !skipped ? (
        <p className="px-3 py-2 text-xs text-muted">See technical details for the raw response.</p>
      ) : null}

      {paramLine && !issue ? (
        <p className="px-3 pb-2 text-[11px] text-muted">
          <span className="font-semibold text-secondary">Inputs: </span>
          {paramLine}
        </p>
      ) : null}

      <details className="border-t border-border/50 bg-page/40">
        <summary className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted cursor-pointer hover:bg-surface-elevated/30">
          Technical details (JSON)
        </summary>
        <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/50 px-0 pb-2">
          <div className="p-2.5 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">Parameters</div>
            <pre className="text-[10px] text-secondary font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto leading-relaxed">
              {params && Object.keys(params).length ? JSON.stringify(params, null, 2) : '{}'}
            </pre>
          </div>
          <div className="p-2.5 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">Raw result</div>
            <pre className="text-[10px] text-secondary font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto leading-relaxed">
              {result !== undefined && result !== null ? JSON.stringify(result, null, 2) : '—'}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}

export default function AICompanyAssistant({ title = 'Company AI Assistant' }) {
  const { user } = useAuth();
  const canCommand = user?.role === 'md' || user?.role === 'manager' || user?.role === 'admin';
  const canCreateLead = canCommand || user?.role === 'sales';
  const storageKey = user?.id ? `crm.ai.companyAssistant.messages.v1.${user.id}` : null;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask anything about revenue, pipeline, and company status. MD/Manager can also execute team and ledger commands.',
    },
  ]);
  const [paramsMeta, setParamsMeta] = useState(null);
  const [aiParams, setAiParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);
  const [agentPhase, setAgentPhase] = useState(0);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

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

  useEffect(() => {
    if (!loading) {
      setAgentPhase(0);
      return;
    }
    setAgentPhase(0);
    const t1 = setTimeout(() => setAgentPhase(1), 450);
    const t2 = setTimeout(() => setAgentPhase(2), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, agentPhase]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const normalized = normalizeStoredMessages(parsed);
      if (normalized && normalized.length) {
        setMessages(normalized);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

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
      const recent = recentForApi([...messages, { role: 'user', text: msg }]);

      const teamRaw = getActiveTeamId();
      const activeTeamId =
        teamRaw != null && String(teamRaw).trim() !== '' ? Number.parseInt(String(teamRaw), 10) : null;
      const payload = {
        message: msg,
        context: {
          role: user?.role || null,
          user_id: user?.id || null,
          active_team_id: Number.isFinite(activeTeamId) ? activeTeamId : null,
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
      const data = res.data || {};
      const executedRaw = data.executed_actions ?? data.executedActions;
      const executedActions = Array.isArray(executedRaw) ? executedRaw : [];
      const replyText =
        typeof data.message === 'string' && data.message.trim()
          ? data.message
          : executedActions.length
            ? 'Done — see tool results below.'
            : 'Done.';
      const reasoning =
        typeof data.reasoning === 'string' && data.reasoning.trim() ? data.reasoning.trim() : null;

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: replyText,
          reasoning,
          executedActions,
        },
      ]);
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

      <div className="rounded-lg border border-border bg-surface shadow-sm flex flex-col max-h-[min(72vh,640px)] min-h-[320px]">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scroll-smooth"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-md border text-sm ${
                m.role === 'user'
                  ? 'bg-surface-elevated/30 border-border text-primary'
                  : 'bg-page border-border/60 text-secondary'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">
                {m.role === 'user' ? 'You' : 'AI'}
              </div>
              {m.role === 'user' ? (
                <div className="whitespace-pre-wrap text-primary">{m.text}</div>
              ) : (
                <div className="space-y-2">
                  {m.reasoning ? (
                    <details
                      open
                      className="rounded-md border border-border/70 bg-surface-elevated/25 overflow-hidden"
                    >
                      <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted hover:bg-surface-elevated/40 transition-colors marker:text-muted">
                        <Brain size={14} className="text-accent shrink-0" aria-hidden />
                        Thinking
                      </summary>
                      <div className="px-3 pb-3 pt-0 text-xs text-secondary leading-relaxed whitespace-pre-wrap border-t border-border/40">
                        {m.reasoning}
                      </div>
                    </details>
                  ) : null}
                  <div className="whitespace-pre-wrap text-primary">{m.text}</div>
                  {m.executedActions && m.executedActions.length > 0 ? (
                    <details className="rounded-md border border-border/80 bg-surface-elevated/20 overflow-hidden">
                      <summary className="cursor-pointer px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted hover:bg-surface-elevated/35 transition-colors flex flex-wrap items-center gap-2 marker:text-muted">
                        <Wrench size={14} className="shrink-0" aria-hidden />
                        <span className="text-left">
                          Supporting data
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted/90 mt-0.5">
                            Plain-language summaries — expand for raw JSON
                          </span>
                        </span>
                        <span className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal ml-auto">
                          {m.executedActions.length} step{m.executedActions.length === 1 ? '' : 's'}
                        </span>
                      </summary>
                      <div className="p-3 pt-0 space-y-2 border-t border-border/40">
                        {m.executedActions.map((a, i) => (
                          <ToolRunBlock key={`${a.action}-${i}`} action={a} />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} className="h-px shrink-0" aria-hidden />
        </div>

        {loading ? (
          <div
            className="shrink-0 border-t border-accent/20 bg-accent/5 px-4 py-3"
            aria-live="polite"
            aria-busy="true"
          >
            <AgentProcessingCard phase={agentPhase} />
          </div>
        ) : null}

        <div className="shrink-0 border-t border-border p-3">
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
          {loading ? (
            <p className="mb-2 text-[11px] text-muted flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse shrink-0" aria-hidden />
              Status updates appear in the panel directly above. Scroll the transcript if you need to re-read earlier turns.
            </p>
          ) : null}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                loading
                  ? 'You can draft your next message while we finish…'
                  : canCommand
                    ? 'Try: "Create team Alpha and add an expense entry to daily_expenses"'
                    : canCreateLead
                      ? 'Try: "List teams" or "Create a task for Alex due Friday"'
                      : 'Try: "What is today revenue and current business snapshot?"'
              }
              className="flex-1 min-h-[44px] max-h-32 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
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
