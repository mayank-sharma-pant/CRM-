import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { toLegacyLeadCsv } = require('../../../../../lib/leadCsv.cjs');

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

function backendHeaders(req) {
  const headers = {};
  const cookie = req.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  const team = req.headers.get('x-team-id');
  if (team) headers['X-Team-Id'] = team;
  return headers;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.text !== 'function') {
      return Response.json({ detail: 'CSV file is required.' }, { status: 400 });
    }
    const mappingRaw = form.get('mapping');
    let mapping = {};
    if (mappingRaw && String(mappingRaw).trim()) {
      try {
        mapping = JSON.parse(String(mappingRaw));
      } catch {
        return Response.json({ detail: 'mapping must be JSON' }, { status: 400 });
      }
    }
    const text = await file.text();
    const csv = toLegacyLeadCsv(text, mapping);
    const outbound = new FormData();
    outbound.append('file', new Blob([csv], { type: 'text/csv' }), 'leads-import.csv');

    const res = await fetch(`${BACKEND}/api/import/leads`, {
      method: 'POST',
      headers: backendHeaders(req),
      body: outbound,
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return Response.json({ detail: 'Import failed.' }, { status: 500 });
  }
}
