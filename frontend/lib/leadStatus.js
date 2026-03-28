/**
 * Normalize lead status from API (enum name, value, or mixed casing) to UI labels.
 */
export function normalizeLeadStatus(s) {
  if (s == null || s === '') return 'New';
  const canonical = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Converted',
    'Lost',
    'Lost Client',
  ];
  if (typeof s === 'string') {
    if (canonical.includes(s)) return s;
    const lower = s.trim().toLowerCase();
    const fromLower = {
      new: 'New',
      contacted: 'Contacted',
      qualified: 'Qualified',
      proposal: 'Proposal',
      converted: 'Converted',
      lost: 'Lost',
      'lost client': 'Lost Client',
    };
    if (fromLower[lower]) return fromLower[lower];
    let raw = s.replace(/^LeadStatus\./i, '').trim();
    const upper = raw.toUpperCase().replace(/\s+/g, '_');
    const fromEnum = {
      NEW: 'New',
      CONTACTED: 'Contacted',
      QUALIFIED: 'Qualified',
      PROPOSAL: 'Proposal',
      CONVERTED: 'Converted',
      LOST: 'Lost',
      LOST_CLIENT: 'Lost Client',
    };
    if (fromEnum[upper]) return fromEnum[upper];
  }
  return typeof s === 'string' ? s : 'New';
}
