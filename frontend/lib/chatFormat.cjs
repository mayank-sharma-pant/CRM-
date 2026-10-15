/**
 * Pure helpers for the team chat UI (no React, no DOM) so they can be unit-tested with node --test.
 */

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase();
}

function dayKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === today) return 'Today';
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function listTimeLabel(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (dayKey(d) === dayKey(now)) return timeLabel(d);
  const label = dayLabel(d, now);
  return label === 'Yesterday' ? label : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Merge server messages (have seq) and local pending ones (no seq yet) into one ordered list.
 * Server copies win over pending copies with the same client_msg_id; duplicates by seq are dropped.
 */
function mergeMessages(existing, incoming) {
  const bySeq = new Map();
  const pending = [];
  for (const m of [...(existing || []), ...(incoming || [])]) {
    if (m && Number.isInteger(m.seq)) bySeq.set(m.seq, m);
    else if (m) pending.push(m);
  }
  const confirmedIds = new Set([...bySeq.values()].map((m) => m.client_msg_id).filter(Boolean));
  const pendingLeft = [];
  const seenPending = new Set();
  for (const m of pending) {
    if (!m.client_msg_id || confirmedIds.has(m.client_msg_id) || seenPending.has(m.client_msg_id)) continue;
    seenPending.add(m.client_msg_id);
    pendingLeft.push(m);
  }
  const confirmed = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
  return [...confirmed, ...pendingLeft];
}

/**
 * Split an ordered message list into day sections, each holding runs of consecutive
 * messages from one sender sent within GROUP_WINDOW_MS of each other.
 */
function groupMessages(messages) {
  const days = [];
  let day = null;
  let run = null;
  for (const m of messages || []) {
    const at = m.created_at ? new Date(m.created_at) : new Date();
    const key = dayKey(at);
    if (!day || day.key !== key) {
      day = { key, date: at, runs: [] };
      days.push(day);
      run = null;
    }
    const last = run && run.messages[run.messages.length - 1];
    const lastAt = last && last.created_at ? new Date(last.created_at) : null;
    if (!run || run.sender_id !== m.sender_id || !lastAt || at - lastAt > GROUP_WINDOW_MS) {
      run = { sender_id: m.sender_id, messages: [] };
      day.runs.push(run);
    }
    run.messages.push(m);
  }
  return days;
}

/** Exponential backoff for socket reconnects: 1s, 2s, 4s … capped at 30s. */
function reconnectDelay(attempt) {
  const n = Math.max(0, Math.floor(attempt));
  return Math.min(30000, 1000 * 2 ** Math.min(n, 5));
}

function roleLabel(role) {
  return {
    sales: 'Sales',
    manager: 'Manager',
    md: 'MD',
    admin: 'Admin',
    purchase: 'Purchase',
  }[role] || role || '';
}

module.exports = {
  GROUP_WINDOW_MS,
  initials,
  dayKey,
  dayLabel,
  timeLabel,
  listTimeLabel,
  mergeMessages,
  groupMessages,
  reconnectDelay,
  roleLabel,
};
