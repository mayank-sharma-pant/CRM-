import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { previewLeadsLocally } = require('../../../../../lib/leadCsv.cjs');

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.text !== 'function') {
      return Response.json({ detail: 'CSV file is required.' }, { status: 400 });
    }
    const mappingRaw = form.get('mapping');
    let mappingOverride = null;
    if (mappingRaw && String(mappingRaw).trim()) {
      try {
        mappingOverride = JSON.parse(String(mappingRaw));
      } catch {
        return Response.json({ detail: 'mapping must be JSON' }, { status: 400 });
      }
    }
    const text = await file.text();
    const preview = previewLeadsLocally(text, mappingOverride);
    return Response.json(preview);
  } catch {
    return Response.json({ detail: 'Failed to read CSV file.' }, { status: 500 });
  }
}
