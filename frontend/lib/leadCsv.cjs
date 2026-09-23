const NONE = '__none__';

const LEAD_FIELDS = [
  'name',
  'email',
  'phone',
  'company',
  'source',
  'service_type',
  'website',
  'industry',
  'linkedin_url',
  'notes',
];

const LEAD_ALIASES = {
  name: [
    'name',
    'full name',
    'lead name',
    'contact',
    'contact name',
    'customer name',
    'client name',
    'person',
    'lead',
  ],
  email: ['email', 'e-mail', 'email address', 'e mail', 'mail'],
  phone: ['phone', 'mobile', 'telephone', 'cell', 'phone number', 'mobile number'],
  company: ['company', 'company name', 'organisation', 'organization', 'account'],
  source: ['source', 'platform', 'campaign name', 'ad name', 'form name', 'lead source'],
  service_type: ['service type', 'service', 'lead status', 'status'],
  website: ['website', 'url', 'web', 'site'],
  industry: ['industry', 'sector', 'vertical'],
  linkedin_url: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin_url'],
  notes: ['notes', 'note', 'comments', 'comment', 'lead work', 'description', 'remarks'],
};

const SOURCE_HEADER_PRIORITY = ['platform', 'campaign_name', 'campaign name', 'source', 'ad_name', 'ad name'];

const FIRST_NAME_ALIASES = new Set(['first name', 'firstname', 'given name']);
const LAST_NAME_ALIASES = new Set(['last name', 'lastname', 'surname', 'family name']);

function normHeader(value) {
  return String(value).trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

function detectDelimiter(text) {
  const line = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .find((row) => row.trim()) || '';
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  if (tabs > commas && tabs >= semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(src);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headerRow = rows.find((cells) => cells.some((value) => String(value).trim())) || [];
  const headers = headerRow.map((value) => String(value).trim()).filter(Boolean);
  const start = rows.indexOf(headerRow) + 1;
  const records = rows.slice(start)
    .filter((cells) => cells.some((value) => String(value).trim()))
    .slice(0, 500)
    .map((cells) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] ?? '';
      });
      return record;
    });
  return { headers, records };
}

function headerFor(headers, aliases, used) {
  return headers.find((header) => !used.has(header) && aliases.has(normHeader(header))) || null;
}

function findHeader(headers, aliases) {
  return headers.find((header) => aliases.has(normHeader(header))) || null;
}

function headerForPreferred(headers, preferred, used) {
  for (const alias of preferred) {
    const header = headers.find(
      (h) => !used.has(h) && normHeader(h) === normHeader(alias),
    );
    if (header) return header;
  }
  return null;
}

function usedMappedColumns(mapping) {
  const used = new Set();
  Object.entries(mapping || {}).forEach(([key, value]) => {
    if (key === 'notes_extra' || !value || value === NONE) return;
    used.add(value);
  });
  return used;
}

function suggestNotesExtra(headers, mapping) {
  const used = usedMappedColumns(mapping);
  return headers.filter((h) => h && !used.has(h));
}

function suggestLeadMapping(headers) {
  const mapping = {};
  const used = new Set();
  LEAD_FIELDS.forEach((field) => {
    if (field === 'source') {
      const header = headerForPreferred(headers, SOURCE_HEADER_PRIORITY, used);
      if (header) {
        mapping.source = header;
        used.add(header);
      }
      return;
    }
    const header = headerFor(headers, new Set(LEAD_ALIASES[field]), used);
    if (header) {
      mapping[field] = header;
      used.add(header);
    }
  });
  if (!mapping.name) {
    const first = headerFor(headers, FIRST_NAME_ALIASES, used);
    if (first) mapping.name = first;
  }
  mapping.notes_extra = suggestNotesExtra(headers, mapping);
  return mapping;
}

function normalizePhoneImport(value) {
  let text = String(value ?? '').trim();
  if (text.toLowerCase().startsWith('p:')) text = text.slice(2).trim();
  return text;
}

function mappedCell(raw, header, field) {
  if (!header) return '';
  const text = String(raw[header] ?? '').trim();
  if (field === 'phone') return normalizePhoneImport(text);
  return text;
}

function composedName(raw, headers) {
  const first = findHeader(headers, FIRST_NAME_ALIASES);
  const last = findHeader(headers, LAST_NAME_ALIASES);
  return [first && raw[first], last && raw[last]]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
}

function leadName(raw, mapping, headers) {
  const selected = mappedCell(raw, mapping.name, 'name');
  if (selected && mapping.name && !FIRST_NAME_ALIASES.has(normHeader(mapping.name))) {
    return selected;
  }
  return composedName(raw, headers) || selected;
}

function cleanMapping(payload) {
  const cleaned = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key === 'notes_extra' && Array.isArray(value)) {
      cleaned.notes_extra = value.filter(Boolean);
      return;
    }
    if (value && value !== NONE && !Array.isArray(value)) cleaned[key] = value;
  });
  return cleaned;
}

function buildNotes(raw, mapping) {
  const base = mappedCell(raw, mapping.notes, 'notes');
  const extras = (mapping.notes_extra || [])
    .map((col) => {
      const val = mappedCell(raw, col, 'notes');
      return val ? `${col}: ${val}` : '';
    })
    .filter(Boolean);
  if (!extras.length) return base;
  return [base, ...extras].filter(Boolean).join('\n');
}

function isInvalidLeadName(name) {
  const text = String(name || '').trim().toLowerCase();
  if (!text) return true;
  if (text.includes('<test lead')) return true;
  return false;
}

function previewLeadsLocally(text, mappingOverride) {
  const { headers, records } = parseCsv(text);
  const suggested = suggestLeadMapping(headers);
  const mapping = mappingOverride ? { ...suggested, ...cleanMapping(mappingOverride) } : suggested;
  const rows = records.map((raw, index) => {
    const values = {};
    LEAD_FIELDS.forEach((field) => {
      values[field] = mappedCell(raw, mapping[field], field);
    });
    values.name = leadName(raw, mapping, headers);
    values.notes = buildNotes(raw, mapping);
    const validName = values.name && !isInvalidLeadName(values.name);
    return {
      index: index + 1,
      status: validName ? 'new' : 'invalid',
      values,
    };
  });
  const counts = { new: 0, duplicate: 0, invalid: 0, total: rows.length };
  rows.forEach((row) => {
    counts[row.status] += 1;
  });
  const hasName = Boolean(mapping.name || findHeader(headers, FIRST_NAME_ALIASES));
  return {
    headers,
    suggested_mapping: suggested,
    mapping,
    rows,
    counts,
    error: hasName ? null : 'CSV mapping must include a name column',
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toLegacyLeadCsv(text, mapping) {
  const { headers, records } = parseCsv(text);
  const cleaned = { ...suggestLeadMapping(headers), ...cleanMapping(mapping) };
  const lines = [LEAD_FIELDS.join(',')];
  records.forEach((raw) => {
    const name = leadName(raw, cleaned, headers);
    if (!name || isInvalidLeadName(name)) return;
    const cells = LEAD_FIELDS.map((field) => {
      if (field === 'name') return csvEscape(name);
      if (field === 'notes') return csvEscape(buildNotes(raw, cleaned));
      return csvEscape(mappedCell(raw, cleaned[field], field));
    });
    if (cells[0]) lines.push(cells.join(','));
  });
  return lines.join('\n');
}

module.exports = {
  parseCsv,
  suggestLeadMapping,
  suggestNotesExtra,
  previewLeadsLocally,
  toLegacyLeadCsv,
};
