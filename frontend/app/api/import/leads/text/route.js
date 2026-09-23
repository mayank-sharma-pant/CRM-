const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req) {
  const headers = {
    'content-type': 'application/json',
  };
  const cookie = req.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  const team = req.headers.get('x-team-id');
  if (team) headers['X-Team-Id'] = team;

  const res = await fetch(`${BACKEND}/api/import/leads/text`, {
    method: 'POST',
    headers,
    body: await req.text(),
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}
