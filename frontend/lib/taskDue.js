import { parseISO, parse, isValid, formatDistanceToNow } from 'date-fns';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse task due from API: plain YYYY-MM-DD is that calendar day in local time;
 * full ISO strings are parsed as absolute instants.
 */
export function parseTaskDueDate(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (DATE_ONLY.test(s)) {
    const d = parse(s, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : null;
  }
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function formatDistanceToTaskDue(raw, options) {
  const d = parseTaskDueDate(raw);
  if (!d) return null;
  return formatDistanceToNow(d, options);
}
