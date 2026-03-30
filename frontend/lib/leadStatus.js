/**
 * Normalize lead status from API (enum name, value, or mixed casing) to UI labels.
 * Only three valid statuses: Active, Converted, Lost.
 */
export function normalizeLeadStatus(s) {
  if (s == null || s === '') return 'Active';
  const canonical = ['Active', 'Converted', 'Lost'];
  if (typeof s === 'string') {
    if (canonical.includes(s)) return s;
    const lower = s.trim().toLowerCase();
    const fromLower = {
      active: 'Active',
      converted: 'Converted',
      lost: 'Lost',
      // Legacy status mappings
      new: 'Active',
      contacted: 'Active',
      qualified: 'Active',
      proposal: 'Active',
      'lost client': 'Lost',
    };
    if (fromLower[lower]) return fromLower[lower];
    let raw = s.replace(/^LeadStatus\./i, '').trim();
    const upper = raw.toUpperCase().replace(/\s+/g, '_');
    const fromEnum = {
      ACTIVE: 'Active',
      CONVERTED: 'Converted',
      LOST: 'Lost',
      // Legacy enum mappings
      NEW: 'Active',
      CONTACTED: 'Active',
      QUALIFIED: 'Active',
      PROPOSAL: 'Active',
      LOST_CLIENT: 'Lost',
    };
    if (fromEnum[upper]) return fromEnum[upper];
  }
  return typeof s === 'string' ? s : 'Active';
}
