/* Two-browser voice-call check against a LOCAL stack with calls enabled (never production).
 * Uses Chromium's fake microphone (a generated tone) and reads WebRTC stats to prove audio flows both ways.
 *
 * 1. Seed a local *_test database:   backend/scripts/calls_e2e_seed.py (same E2E_PW)
 * 2. Backend (2 workers + Redis), e.g. from backend/:
 *      DATABASE_URL=postgresql://localhost:5432/crm_chat_test CHAT_ENABLED=true CHAT_CALLS_ENABLED=true \
 *      CHAT_CALL_RING_SECONDS=12 REDIS_URL=redis://127.0.0.1:6379/3 CORS_ORIGINS=http://localhost:3000 \
 *      CHAT_WS_ALLOWED_ORIGINS=http://localhost:3000 CHAT_WS_PUBLIC_URL=ws://localhost:8000/api/chat/ws \
 *      venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker app.main:app -b 127.0.0.1:8000
 * 3. Frontend: npm run build && npm run start -- --hostname localhost --port 3000
 * 4. From frontend/: BASE=http://localhost:3000 E2E_PW=... node e2e/manual/calls-two-browsers.cjs
 *    (CHROME_EXE=/path/to/chrome-headless-shell if Playwright's bundled browser isn't installed)
 */
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE || 'http://localhost:3000';
const PW = process.env.E2E_PW;
const EXE = process.env.CHROME_EXE ? { executablePath: process.env.CHROME_EXE } : {};
const FAKE_MEDIA = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
const RECORD_PCS = `(() => {
  const Orig = window.RTCPeerConnection;
  if (!Orig) return;
  window.__pcs = [];
  window.RTCPeerConnection = class extends Orig { constructor(...a) { super(...a); window.__pcs.push(this); } };
})();`;

const results = [];
function check(name, ok, detail = '') {
  results.push(Boolean(ok));
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function login(context, who) {
  const page = await context.newPage();
  await page.addInitScript(RECORD_PCS);
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', `${who}@calls-e2e.test`);
  await page.fill('input[name="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  return page;
}

async function conversationWith(page, fullName) {
  const data = await page.evaluate(async () => (await fetch('/api/chat/conversations')).json());
  return data.items.find((c) => c.other_user && c.other_user.full_name === fullName).id;
}

async function audio(page) {
  return page.evaluate(async () => {
    const pc = (window.__pcs || []).filter((p) => p.connectionState === 'connected').pop();
    if (!pc) return null;
    const stats = await pc.getStats();
    const out = { inBytes: 0, outBytes: 0, level: 0 };
    stats.forEach((r) => {
      if (r.type === 'inbound-rtp' && r.kind === 'audio') { out.inBytes = r.bytesReceived || 0; out.level = r.audioLevel || 0; }
      if (r.type === 'outbound-rtp' && r.kind === 'audio') out.outBytes = r.bytesSent || 0;
    });
    return out;
  });
}

// Level of the microphone track being sent (headless Chromium has no audio output, so the
// receiving side's level stats are not meaningful; the sending track's level is).
async function sentLevel(page, ms) {
  let max = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const level = await page.evaluate(async () => {
      const pc = (window.__pcs || []).filter((p) => p.connectionState === 'connected').pop();
      if (!pc) return 0;
      let l = 0;
      (await pc.getStats()).forEach((r) => { if (r.type === 'media-source' && r.kind === 'audio') l = r.audioLevel || 0; });
      return l;
    });
    max = Math.max(max, level);
    await page.waitForTimeout(150);
  }
  return max;
}

const overlayStatus = (page) => page.locator('[role="region"][aria-label="Voice call"] p[aria-live="polite"]');
const endedToast = (page) => page.locator('[role="status"]').filter({ hasText: /call|answer|busy|declined|connect|Microphone/i }).first();

async function waitActive(page) {
  await overlayStatus(page).filter({ hasText: /^\d+:\d\d$/ }).waitFor({ timeout: 20000 });
}

async function dial(page) {
  await page.locator('button[aria-label^="Voice call"]').click();
}

(async () => {
  const browser = await chromium.launch({ ...EXE, args: FAKE_MEDIA });
  const callerCtx = await browser.newContext({ permissions: ['microphone'] });
  const calleeCtx = await browser.newContext({ permissions: ['microphone'] });
  const thirdCtx = await browser.newContext({ permissions: ['microphone'] });
  const caller = await login(callerCtx, 'caller');
  const callee = await login(calleeCtx, 'callee');
  const third = await login(thirdCtx, 'third');

  const convId = await conversationWith(caller, 'E2E Callee');
  await caller.goto(`${BASE}/chat?c=${convId}`);
  await caller.locator('button[aria-label^="Voice call"]').waitFor({ timeout: 20000 });
  const calleeHome = new URL(callee.url()).pathname;
  check('callee is on another CRM page (not chat)', !calleeHome.startsWith('/chat'), calleeHome);
  await caller.waitForTimeout(1500); // let both sockets connect

  // 1. Connected call with audio both ways
  await dial(caller);
  const ring = callee.locator('[role="alertdialog"]');
  await ring.waitFor({ timeout: 15000 });
  check('incoming call rings on the callee\'s current page', await ring.getByText('E2E Caller').isVisible());
  check('caller sees "Calling…"', (await overlayStatus(caller).textContent()) === 'Calling…');
  await ring.getByRole('button', { name: 'Accept' }).click();
  await waitActive(caller);
  await waitActive(callee);
  check('both sides show the call timer', true);

  const a1 = [await audio(caller), await audio(callee)];
  await caller.waitForTimeout(3000);
  const a2 = [await audio(caller), await audio(callee)];
  check('caller → callee audio flows', a2[0].outBytes > a1[0].outBytes && a2[1].inBytes > a1[1].inBytes,
    `caller sent +${a2[0].outBytes - a1[0].outBytes} B, callee received +${a2[1].inBytes - a1[1].inBytes} B`);
  check('callee → caller audio flows', a2[1].outBytes > a1[1].outBytes && a2[0].inBytes > a1[0].inBytes,
    `callee sent +${a2[1].outBytes - a1[1].outBytes} B, caller received +${a2[0].inBytes - a1[0].inBytes} B`);

  const levelBefore = await sentLevel(caller, 2000);
  await caller.locator('button[aria-label="Mute"]').click();
  await caller.waitForTimeout(1000); // the level stat is averaged over a short window
  const levelMuted = await sentLevel(caller, 2000);
  const mutedNow = await sentLevel(caller, 1);
  await caller.locator('button[aria-label="Unmute"]').click();
  await caller.waitForTimeout(1000);
  const levelAfter = await sentLevel(caller, 2000);
  check('mute silences what the caller sends, unmute restores it',
    levelBefore > 0.05 && levelMuted < levelBefore * 0.01 && mutedNow === 0 && levelAfter > 0.05,
    `peak level ${levelBefore.toFixed(4)} → muted peak ${levelMuted.toFixed(4)} (now ${mutedNow}) → unmuted ${levelAfter.toFixed(4)}`);

  // Busy: a third person rings the callee mid-call
  const thirdConv = await conversationWith(third, 'E2E Callee');
  await third.goto(`${BASE}/chat?c=${thirdConv}`);
  await third.locator('button[aria-label^="Voice call"]').waitFor({ timeout: 20000 });
  await third.waitForTimeout(1500);
  await dial(third);
  const busy = endedToast(third);
  await busy.waitFor({ timeout: 15000 });
  check('third caller gets "Busy on another call"', /Busy on another call/.test(await busy.textContent()), await busy.textContent());
  check('callee is not interrupted by the busy attempt', (await callee.locator('[role="alertdialog"]').count()) === 0);

  // Navigate inside the CRM during the call
  const before = await audio(callee);
  await callee.locator('a[href="/chat"]').first().click();
  await callee.waitForURL(/\/chat/, { timeout: 15000 });
  await callee.waitForTimeout(2500);
  const after = await audio(callee);
  check('call continues while the callee moves to another CRM page', after && after.inBytes > before.inBytes && (await overlayStatus(callee).count()) === 1,
    `received +${after ? after.inBytes - before.inBytes : 0} B after navigating`);

  // Hang up
  await caller.locator('button[aria-label="Hang up"]').click();
  await endedToast(callee).waitFor({ timeout: 15000 });
  check('hang-up reaches the other side', /Call ended/.test(await endedToast(callee).textContent()));
  const released = await caller.evaluate(() => (window.__pcs || []).every((p) => p.connectionState === 'closed' || p.signalingState === 'closed'));
  check('caller released the connection after hang-up', released);

  await callee.goto(`${BASE}/chat?c=${convId}`);
  const entriesBefore = { callee: 0, caller: 0 };
  const incomingEntry = callee.getByText(/Incoming voice call · \d+:\d\d/);
  await incomingEntry.last().waitFor({ timeout: 15000 });
  const inText = await incomingEntry.last().textContent();
  check('callee chat shows this call as "Incoming voice call · m:ss"', /· 0:(1\d|2\d|3\d)/.test(inText), inText);
  const outgoingEntry = caller.getByText(/Outgoing voice call · \d+:\d\d/);
  await outgoingEntry.last().waitFor({ timeout: 15000 });
  const outText = await outgoingEntry.last().textContent();
  check('caller chat shows this call as "Outgoing voice call · m:ss"', outText.split('·')[1] === inText.split('·')[1], outText);

  // 2. Declined
  await caller.waitForTimeout(1000);
  await dial(caller);
  await callee.locator('[role="alertdialog"]').waitFor({ timeout: 15000 });
  await callee.locator('[role="alertdialog"]').getByRole('button', { name: 'Decline' }).click();
  await endedToast(caller).waitFor({ timeout: 15000 });
  check('caller sees "Call declined"', /Call declined/.test(await endedToast(caller).textContent()));

  // 3. Missed (ring time is 12 s on this test stack)
  await caller.waitForTimeout(4000);
  await dial(caller);
  await callee.locator('[role="alertdialog"]').waitFor({ timeout: 15000 });
  await endedToast(caller).waitFor({ timeout: 25000 });
  check('unanswered call: caller sees "No answer"', /No answer/.test(await endedToast(caller).textContent()));
  const missed = callee.getByText('Missed voice call').first();
  await missed.waitFor({ timeout: 15000 });
  check('callee chat shows "Missed voice call"', true);

  // 4. Microphone blocked. Headless Chromium can't show a permission prompt, so the denial is
  //    simulated the way a real browser reports it: getUserMedia rejects with NotAllowedError.
  const strictCtx = await browser.newContext();
  await strictCtx.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  const blocked = await login(strictCtx, 'third');
  await blocked.goto(`${BASE}/chat?c=${thirdConv}`);
  await blocked.locator('button[aria-label^="Voice call"]').waitFor({ timeout: 20000 });
  await blocked.waitForTimeout(1500);
  await dial(blocked);
  const micMsg = endedToast(blocked);
  await micMsg.waitFor({ timeout: 15000 });
  check('blocked microphone (simulated denial) shows "Microphone blocked" and no call rings', /Microphone blocked/.test(await micMsg.textContent())
    && (await callee.locator('[role="alertdialog"]').count()) === 0, await micMsg.textContent());

  await browser.close();
  console.log(`\nSUMMARY: ${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((err) => {
  console.error('E2E aborted:', err.message);
  process.exit(2);
});
