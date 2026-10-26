/* Voice-call reliability scenarios against a LOCAL stack with calls enabled (never production).
 * Same setup as calls-two-browsers.cjs (seeded calls-e2e.test users, backend with 2 workers + Redis,
 * CHAT_CALL_RING_SECONDS=12, frontend built and started). Chromium only: proves nothing about Safari.
 *
 * From frontend/:  BASE=http://localhost:3000 E2E_PW=... [SCENARIOS=race,calls5,...] node e2e/manual/chat-call-reliability.cjs
 * Optional hooks (local commands run between steps): HOOK_KILL_WORKERS, HOOK_REDIS_DOWN, HOOK_REDIS_UP.
 */
const { execSync } = require('child_process');
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE || 'http://localhost:3000';
const PW = process.env.E2E_PW;
const EXE = process.env.CHROME_EXE ? { executablePath: process.env.CHROME_EXE } : {};
const FAKE_MEDIA = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
const RING_SECONDS = Number(process.env.RING_SECONDS || 12);
const ALL = ['race', 'calls5', 'iceReuse', 'ringSafety', 'callerDropRinging', 'calleeDropRinging', 'dropActive', 'reloadActive',
  'bothHangUp', 'cancelBeforeId', 'cancelVsAccept', 'micDenied', 'offline', 'longCall', 'tenCalls', 'hiddenTab',
  'callerTwoTabs', 'killWorkers', 'redisBlip'];
const SCENARIOS = (process.env.SCENARIOS || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

// Tracks every WebSocket the page opens, can drop or delay chosen server event types, and records
// RTCPeerConnections / microphone streams.
const INSTRUMENT = `(() => {
  // Long timers (the ring safety timer among them), for diagnosing a scenario that fails.
  window.__timers = [];
  const setT = window.setTimeout.bind(window);
  const clearT = window.clearTimeout.bind(window);
  const now = () => new Date().toISOString().slice(11, 23);
  window.setTimeout = (fn, ms, ...args) => {
    if (!(ms >= 20000 && ms < 100000)) return setT(fn, ms, ...args);
    const rec = { ms, set: now(), fired: null, cleared: null };
    window.__timers.push(rec);
    rec.id = setT(() => { rec.fired = now(); fn(...args); }, ms);
    return rec.id;
  };
  window.clearTimeout = (id) => {
    const rec = window.__timers.find((r) => r.id === id && !r.fired && !r.cleared);
    if (rec) rec.cleared = now();
    return clearT(id);
  };
  const OrigWS = window.WebSocket;
  window.__sockets = [];
  window.__drop = new Set();
  window.__delay = {};
  window.__ready = 0;
  window.__frames = [];
  const note = (dir, f) => { if (String(f.type).startsWith('call.')) window.__frames.push([dir, f.type, f.code || f.status || '', new Date().toISOString().slice(11, 23)]); };
  class Tracked extends OrigWS {
    constructor(...a) {
      super(...a);
      window.__sockets.push(this);
      this.addEventListener('message', (e) => {
        try {
          const f = JSON.parse(e.data);
          if (f.type === 'ready') window.__ready += 1;
          note('in', f);
        } catch (_) {}
      });
    }
    send(data) {
      try { note('out', JSON.parse(data)); } catch (_) {}
      return super.send(data);
    }
    set onmessage(fn) {
      super.onmessage = typeof fn !== 'function' ? fn : (e) => {
        let type = null;
        try { type = JSON.parse(e.data).type; } catch (_) {}
        if (type && window.__drop.has(type)) return;
        if (type && window.__delay[type]) { setTimeout(() => fn.call(this, e), window.__delay[type]); return; }
        fn.call(this, e);
      };
    }
    get onmessage() { return super.onmessage; }
  }
  window.WebSocket = Tracked;
  const OrigPC = window.RTCPeerConnection;
  window.__pcs = [];
  if (OrigPC) window.RTCPeerConnection = class extends OrigPC { constructor(...a) { super(...a); window.__pcs.push(this); } };
  window.__streams = [];
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const gum = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => { const st = await gum(c); window.__streams.push(st); return st; };
  }
})();`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function hook(name) {
  const cmd = process.env[name];
  if (!cmd) return false;
  execSync(cmd, { stdio: 'inherit' });
  return true;
}

const sleep = (page, ms) => page.waitForTimeout(ms);
const overlay = (page) => page.locator('[role="region"][aria-label="Voice call"]');
const overlayStatus = (page) => page.locator('[role="region"][aria-label="Voice call"] p[aria-live="polite"]');
const ringCard = (page) => page.locator('[role="alertdialog"]');
const endedToast = (page) => page.locator('[role="status"]').filter({ hasText: /call|answer|busy|declined|connect|Microphone|Connection/i }).first();
const openSockets = (page) => page.evaluate(() => window.__sockets.filter((s) => s.readyState <= 1).length);

async function login(context, who, { slowTickets = 0 } = {}) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.__ice = 0;
  page.on('response', (r) => { if (r.url().includes('/api/chat/calls/ice-servers')) page.__ice += 1; });
  await page.addInitScript(INSTRUMENT);
  if (slowTickets) {
    await page.route('**/api/chat/ws-ticket', async (route) => {
      await new Promise((r) => setTimeout(r, slowTickets));
      await route.continue();
    });
  }
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', `${who}@calls-e2e.test`);
  await page.fill('input[name="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  return page;
}

async function liveSocket(page, timeout = 30000) {
  await page.waitForFunction(() => window.__sockets.some((s) => s.readyState === 1) && window.__ready > 0, null, { timeout });
}

async function conversationWith(page, fullName) {
  const data = await page.evaluate(async () => (await fetch('/api/chat/conversations')).json());
  return data.items.find((c) => c.other_user && c.other_user.full_name === fullName).id;
}

async function lastCall(page, convId) {
  return page.evaluate(async (id) => {
    const items = (await (await fetch(`/api/chat/conversations/${id}/messages`)).json()).items || [];
    const calls = items.filter((m) => m.call);
    return { count: calls.length, last: calls.length ? calls[calls.length - 1].call : null };
  }, convId);
}

// Messages are paged, so new call entries are counted after a known seq, not in the latest page.
async function lastSeq(page, convId) {
  return page.evaluate(async (id) => {
    const items = (await (await fetch(`/api/chat/conversations/${id}/messages`)).json()).items || [];
    return items.length ? items[items.length - 1].seq : 0;
  }, convId);
}
async function callsSince(page, convId, seq) {
  return page.evaluate(async ([id, after]) => {
    const items = (await (await fetch(`/api/chat/conversations/${id}/messages?after_seq=${after}`)).json()).items || [];
    return items.filter((m) => m.call).map((m) => m.call.status);
  }, [convId, seq]);
}

async function audio(page) {
  return page.evaluate(async () => {
    const pc = (window.__pcs || []).filter((p) => p.connectionState === 'connected').pop();
    if (!pc) return null;
    const out = { inBytes: 0, outBytes: 0 };
    (await pc.getStats()).forEach((r) => {
      if (r.type === 'inbound-rtp' && r.kind === 'audio') out.inBytes = r.bytesReceived || 0;
      if (r.type === 'outbound-rtp' && r.kind === 'audio') out.outBytes = r.bytesSent || 0;
    });
    return out;
  });
}

async function audioFlows(a, b) {
  const a1 = await audio(a); const b1 = await audio(b);
  await sleep(a, 2000);
  const a2 = await audio(a); const b2 = await audio(b);
  return Boolean(a1 && b1 && a2 && b2 && a2.outBytes > a1.outBytes && b2.inBytes > b1.inBytes && b2.outBytes > b1.outBytes && a2.inBytes > a1.inBytes);
}

const isActive = async (page) => (await overlayStatus(page).filter({ hasText: /^\d+:\d\d$/ }).count()) === 1;
async function waitActive(page, timeout = 20000) {
  await overlayStatus(page).filter({ hasText: /^\d+:\d\d$/ }).waitFor({ timeout });
}
async function waitIdle(page, timeout) {
  await page.waitForFunction(() => !document.querySelector('[role="region"][aria-label="Voice call"]') && !document.querySelector('[role="alertdialog"]'), null, { timeout });
}
// The server allows 10 call invites per user per calendar minute ("Too many calls"); a refused
// invite waits for the next minute and dials again, so back-to-back scenarios don't trip it.
async function dial(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const mark = await page.evaluate(() => window.__frames.length);
    await page.locator('button[aria-label^="Voice call"]').click();
    const outcome = await page.waitForFunction((m) => {
      const frames = window.__frames.slice(m).filter((f) => f[0] === 'in');
      if (frames.some((f) => f[1] === 'call.error' && f[2] === 'rate_limited')) return 'limited';
      return frames.some((f) => f[1] === 'call.outgoing' || f[1] === 'call.error') ? 'answered' : false;
    }, mark, { timeout: 10000 }).then((h) => h.jsonValue()).catch(() => 'no reply');
    if (outcome !== 'limited') return;
    const wait = 60000 - (Date.now() % 60000) + 1500;
    console.log(`  invite limit reached (10 per minute); waiting ${Math.round(wait / 1000)} s`);
    await page.waitForTimeout(wait);
  }
}
async function accept(page) {
  await ringCard(page).waitFor({ timeout: 15000 });
  await ringCard(page).getByRole('button', { name: 'Accept' }).click();
}
async function hangUp(page) {
  await overlay(page).getByRole('button', { name: 'Hang up' }).click();
}
// While ringing out, the same button is labelled Cancel.
async function cancel(page) {
  await overlay(page).getByRole('button', { name: 'Cancel' }).click();
}
async function closeSocket(page) {
  await page.evaluate(() => new Promise((resolve) => {
    const s = window.__sockets.find((x) => x.readyState === 1);
    if (!s) { resolve(); return; }
    s.addEventListener('close', () => resolve());
    s.close();
  }));
}

async function dump(label, page) {
  const info = await page.evaluate(() => ({
    frames: window.__frames.slice(-8),
    timers: window.__timers.slice(-4).map(({ ms, set, fired, cleared }) => ({ ms, set, fired, cleared })),
    sockets: window.__sockets.map((s) => s.readyState).join(''),
    visibility: document.visibilityState,
    focused: document.hasFocus(),
  })).catch((err) => ({ error: err.message }));
  info.timerProbe = await page.evaluate(() => new Promise((resolve) => {
    const t0 = Date.now();
    setTimeout(() => resolve(`2 s timer fired after ${Date.now() - t0} ms`), 2000);
  })).catch((err) => err.message);
  console.log(`  ${label}: ${JSON.stringify(info)}`);
}

async function connectedCall(caller, callee) {
  await dial(caller);
  try {
    await ringCard(callee).waitFor({ timeout: 15000 });
  } catch (err) {
    const frames = await caller.evaluate(() => JSON.stringify(window.__frames.slice(-6)));
    throw new Error(`callee did not ring; caller's last call frames: ${frames}`);
  }
  await accept(callee);
  await waitActive(caller);
  await waitActive(callee);
}

(async () => {
  const browser = await chromium.launch({ ...EXE, args: FAKE_MEDIA });
  const ctx = (opts = {}) => browser.newContext({ permissions: ['microphone'], ...opts });
  const callerCtx = await ctx();
  const calleeCtx = await ctx();
  const caller = await login(callerCtx, 'caller');
  let callee = await login(calleeCtx, 'callee', { slowTickets: 2500 });
  const convId = await conversationWith(caller, 'E2E Callee');
  await caller.goto(`${BASE}/chat?c=${convId}`);
  await caller.locator('button[aria-label^="Voice call"]:not([disabled])').waitFor({ timeout: 30000 });
  await liveSocket(caller);
  await liveSocket(callee);
  const run = (name) => SCENARIOS.includes(name);
  const settle = async () => { await sleep(caller, 1500); await liveSocket(caller); await liveSocket(callee); };

  try {
    if (run('race')) {
      // Socket closes, the reconnect timer starts connect() (ticket delayed 2.5 s), and the page becomes
      // visible again while that connect() is still waiting for its ticket.
      await callee.evaluate(() => { window.__ready = 0; });
      await closeSocket(callee);
      await sleep(callee, 1300);
      await callee.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await sleep(callee, 7000);
      const n = await openSockets(callee);
      check('race: one open socket per tab after reconnect + visibility', n === 1, `${n} open socket(s)`);
      await liveSocket(callee);
      check('race: tab is live again', true);
    }
    await callee.unroute('**/api/chat/ws-ticket');

    if (run('calls5')) {
      let ok = 0;
      for (let i = 1; i <= 5; i++) {
        try {
          await connectedCall(caller, callee);
          const flows = await audioFlows(caller, callee);
          const stillUp = await isActive(callee) && await isActive(caller);
          await hangUp(i % 2 ? caller : callee);
          await waitIdle(caller, 15000); await waitIdle(callee, 15000);
          if (flows && stillUp) ok += 1;
          else console.log(`  call ${i}: audio=${flows} stillUp=${stillUp}`);
        } catch (err) {
          console.log(`  call ${i} failed: ${err.message.split('\n')[0]}`);
          await waitIdle(caller, 30000).catch(() => {}); await waitIdle(callee, 30000).catch(() => {});
        }
        await sleep(caller, 1200);
      }
      check('calls5: 5 consecutive calls connect with audio both ways and end cleanly', ok === 5, `${ok}/5`);
    }

    if (run('iceReuse')) {
      // The ICE server endpoint is rate-limited per user (30 per 10 min): calls must not fetch it every time.
      await settle();
      const before = [caller.__ice, callee.__ice];
      for (let i = 0; i < 3; i++) {
        await connectedCall(caller, callee);
        await hangUp(caller);
        await waitIdle(callee, 10000);
        await sleep(caller, 1000);
      }
      const used = [caller.__ice - before[0], callee.__ice - before[1]];
      check('iceReuse: 3 calls reuse the ICE server list (at most one fetch per tab)', used[0] <= 1 && used[1] <= 1, `caller ${used[0]}, callee ${used[1]} fetch(es)`);
    }

    if (run('ringSafety')) {
      // The server ends the unanswered call at RING_SECONDS, but its call.ended never reaches either page.
      await settle();
      await caller.evaluate(() => window.__drop.add('call.ended'));
      await callee.evaluate(() => window.__drop.add('call.ended'));
      const t0 = Date.now();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      let cleared = true;
      try {
        await waitIdle(callee, (RING_SECONDS + 30) * 1000);
        await caller.locator('[role="region"][aria-label="Voice call"]').waitFor({ state: 'detached', timeout: 10000 });
      } catch { cleared = false; }
      const secs = Math.round((Date.now() - t0) / 1000);
      check('ringSafety: both sides stop ringing even when call.ended is lost', cleared, cleared ? `cleared after ~${secs} s` : `still ringing after ${secs} s`);
      await caller.evaluate(() => window.__drop.clear());
      await callee.evaluate(() => window.__drop.clear());
      const lc = await lastCall(caller, convId);
      check('ringSafety: the call is recorded as missed', lc.last && lc.last.status === 'missed', JSON.stringify(lc.last && lc.last.status));
      if (!cleared) { await caller.reload(); await callee.reload(); }
    }

    if (run('callerDropRinging')) {
      await settle();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      await closeSocket(caller);
      let ok = true;
      try { await ringCard(callee).waitFor({ state: 'detached', timeout: 10000 }); } catch { ok = false; }
      check("callerDropRinging: callee stops ringing when the caller's connection drops", ok);
      await waitIdle(caller, 10000).catch(() => {});
      await sleep(caller, 1500);
      const lc = await lastCall(callee, convId);
      check('callerDropRinging: recorded as cancelled', lc.last && lc.last.status === 'cancelled', lc.last && lc.last.status);
    }

    if (run('calleeDropRinging')) {
      await settle();
      const t0 = Date.now();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      await closeSocket(callee);
      let ok = true;
      try { await waitIdle(caller, (RING_SECONDS + 10) * 1000); } catch { ok = false; }
      check("calleeDropRinging: caller's ringing ends by the ring timeout", ok, `~${Math.round((Date.now() - t0) / 1000)} s`);
      const lc = await lastCall(caller, convId);
      check('calleeDropRinging: recorded as missed', lc.last && lc.last.status === 'missed', lc.last && lc.last.status);
    }

    for (const [name, side] of [['dropActive', 'callee'], ['reloadActive', 'caller']]) {
      if (!run(name)) continue;
      await settle();
      const before = await lastSeq(caller, convId);
      await connectedCall(caller, callee);
      const dropper = side === 'callee' ? callee : caller;
      const other = side === 'callee' ? caller : callee;
      if (name === 'dropActive') await closeSocket(dropper); else await dropper.reload();
      let ok = true;
      try { await waitIdle(other, 15000); } catch { ok = false; }
      check(`${name}: other side's call ends when the ${side} ${name === 'dropActive' ? 'loses its connection' : 'reloads'}`, ok);
      await sleep(caller, 1500);
      const added = await callsSince(other, convId, before);
      check(`${name}: exactly one completed entry`, added.length === 1 && added[0] === 'completed', JSON.stringify(added));
    }

    if (run('bothHangUp')) {
      await settle();
      const before = await lastSeq(caller, convId);
      await connectedCall(caller, callee);
      await Promise.all([hangUp(caller), hangUp(callee)]);
      let ok = true;
      try { await waitIdle(caller, 10000); await waitIdle(callee, 10000); } catch { ok = false; }
      await sleep(caller, 1500);
      const added = await callsSince(caller, convId, before);
      check('bothHangUp: both sides end', ok);
      check('bothHangUp: exactly one entry', added.length === 1 && added[0] === 'completed', JSON.stringify(added));
    }

    if (run('cancelBeforeId')) {
      // The invite reaches the server and the callee rings, but the caller's call.outgoing is late.
      await settle();
      await caller.evaluate(() => { window.__delay['call.outgoing'] = 3000; });
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      await cancel(caller);
      let ok = true;
      try { await ringCard(callee).waitFor({ state: 'detached', timeout: 10000 }); } catch { ok = false; }
      check('cancelBeforeId: callee stops ringing when the caller cancels before knowing the call id', ok);
      await caller.evaluate(() => { delete window.__delay['call.outgoing']; });
      await sleep(caller, 1500);
      const lc = await lastCall(caller, convId);
      check('cancelBeforeId: recorded as cancelled', lc.last && lc.last.status === 'cancelled', lc.last && lc.last.status);
    }

    if (run('cancelVsAccept')) {
      await settle();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      await Promise.all([cancel(caller), ringCard(callee).getByRole('button', { name: 'Accept' }).click()]);
      let ok = true;
      try { await waitIdle(caller, 20000); await waitIdle(callee, 20000); } catch { ok = false; }
      check('cancelVsAccept: both sides end cleanly (nobody stuck connecting)', ok);
    }

    if (run('micDenied')) {
      await settle();
      const deniedCtx = await ctx();
      await deniedCtx.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      });
      const denied = await login(deniedCtx, 'callee');
      await liveSocket(denied);
      await callee.close();
      await dial(caller);
      await accept(denied);
      const toast = endedToast(denied);
      await toast.waitFor({ timeout: 10000 }).catch(() => {});
      const calleeMsg = await toast.textContent().catch(() => '');
      const callerToast = endedToast(caller);
      await callerToast.waitFor({ timeout: 10000 }).catch(() => {});
      const callerMsg = await callerToast.textContent().catch(() => '');
      check('micDenied: callee sees the microphone message', /Microphone blocked/.test(calleeMsg || ''), calleeMsg);
      check('micDenied: caller sees "Call declined"', /Call declined/.test(callerMsg || ''), callerMsg);
      await deniedCtx.close();
      const fresh = await login(calleeCtx, 'callee');
      await liveSocket(fresh);
      callee = fresh;
    }

    if (run('offline')) {
      await settle();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      await calleeCtx.setOffline(true);
      let ok = true;
      try { await waitIdle(caller, (RING_SECONDS + 30) * 1000); await waitIdle(callee, (RING_SECONDS + 30) * 1000); } catch { ok = false; }
      check('offline (ringing): both sides end, no endless ringing', ok);
      await calleeCtx.setOffline(false);
      await liveSocket(callee, 60000);
      await connectedCall(caller, callee);
      // A short network blip: Chromium's offline emulation pauses traffic without closing open
      // connections. The call must survive it, and hanging up afterwards must still end both sides.
      await callerCtx.setOffline(true);
      await sleep(caller, 10000);
      await callerCtx.setOffline(false);
      await sleep(caller, 5000);
      const flows = await audioFlows(caller, callee);
      check('offline (active): a 10 s network blip does not drop the call', flows && await isActive(caller) && await isActive(callee), `audio=${flows}`);
      await hangUp(caller);
      ok = true;
      try { await waitIdle(caller, 15000); await waitIdle(callee, 15000); } catch { ok = false; }
      check('offline (active): hang-up after the blip ends both sides', ok);
      await liveSocket(caller, 60000);
      await sleep(caller, 2000);
      const lc = await lastCall(caller, convId);
      check('offline (active): call recorded as completed', lc.last && lc.last.status === 'completed', lc.last && lc.last.status);
    }

    if (run('longCall')) {
      await settle();
      const secs = Number(process.env.LONG_CALL_SECONDS || 200);
      await connectedCall(caller, callee);
      await sleep(caller, secs * 1000);
      const flows = await audioFlows(caller, callee);
      check(`longCall: still connected with audio after ${secs} s`, flows && await isActive(caller) && await isActive(callee));
      await hangUp(caller);
      let ok = true;
      try { await waitIdle(callee, 10000); } catch { ok = false; }
      check('longCall: hang-up still reaches the other side', ok);
      await sleep(caller, 1500);
      const lc = await lastCall(caller, convId);
      check('longCall: recorded with the full duration', lc.last && lc.last.status === 'completed' && lc.last.duration_s >= secs, lc.last && `${lc.last.status} ${lc.last.duration_s} s`);
    }

    if (run('tenCalls')) {
      await settle();
      let ok = 0;
      for (let i = 1; i <= 10; i++) {
        try {
          await connectedCall(caller, callee);
          await hangUp(i % 2 ? caller : callee);
          await waitIdle(caller, 10000); await waitIdle(callee, 10000);
          ok += 1;
        } catch (err) {
          console.log(`  call ${i} failed: ${err.message.split('\n')[0]}`);
          await waitIdle(caller, 30000).catch(() => {}); await waitIdle(callee, 30000).catch(() => {});
        }
        await sleep(caller, 800);
      }
      check('tenCalls: 10 back-to-back calls connect and end', ok === 10, `${ok}/10`);
    }

    if (run('hiddenTab')) {
      await settle();
      await connectedCall(caller, callee);
      await callee.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(caller, 3000);
      await callee.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(caller, 3000);
      const flows = await audioFlows(caller, callee);
      const n = await openSockets(callee);
      check('hiddenTab: call continues after hidden/visible', flows && await isActive(callee), `audio=${flows}`);
      check('hiddenTab: still one open socket', n === 1, `${n}`);
      await hangUp(caller);
      await waitIdle(callee, 10000).catch(() => {});
    }

    if (run('callerTwoTabs')) {
      await settle();
      const second = await callerCtx.newPage();
      await second.addInitScript(INSTRUMENT);
      await second.goto(`${BASE}/chat?c=${convId}`);
      await liveSocket(second);
      await dial(caller);
      await accept(callee);
      await waitActive(caller);
      const otherTabShows = (await overlay(second).count()) + (await ringCard(second).count());
      check('callerTwoTabs: only the dialing tab shows the call', otherTabShows === 0, `${otherTabShows} call UI element(s) in the other tab`);
      await hangUp(caller);
      await waitIdle(callee, 10000).catch(() => {});
      await second.close();
    }

    if (run('killWorkers') && process.env.HOOK_KILL_WORKERS) {
      // Backend workers die abruptly while ringing: no socket cleanup, the ring timer is lost.
      await settle();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      hook('HOOK_KILL_WORKERS');
      let ok = true;
      try { await waitIdle(caller, (RING_SECONDS + 30) * 1000); await waitIdle(callee, (RING_SECONDS + 30) * 1000); } catch { ok = false; }
      check('killWorkers: both sides stop ringing', ok);
      await liveSocket(caller, 60000); await liveSocket(callee, 60000);
      const sweepWait = Number(process.env.SWEEP_WAIT_SECONDS || 200);
      let status = null;
      const until = Date.now() + sweepWait * 1000;
      while (Date.now() < until) {
        status = (await lastCall(caller, convId)).last;
        if (status && status.status === 'interrupted') break;
        await sleep(caller, 5000);
      }
      check('killWorkers: the stale call is closed as interrupted and shows in the chat', status && status.status === 'interrupted', status && status.status);
      await connectedCall(caller, callee);
      check('killWorkers: calls work again after the restart', true);
      await hangUp(caller);
      await waitIdle(callee, 10000).catch(() => {});
    }

    if (run('redisBlip') && process.env.HOOK_REDIS_DOWN && process.env.HOOK_REDIS_UP) {
      await settle();
      await dial(caller);
      await ringCard(callee).waitFor({ timeout: 15000 });
      hook('HOOK_REDIS_DOWN');
      await sleep(caller, 4000);
      hook('HOOK_REDIS_UP');
      let ok = true;
      try { await waitIdle(caller, (RING_SECONDS + 40) * 1000); await waitIdle(callee, (RING_SECONDS + 40) * 1000); } catch { ok = false; }
      check('redisBlip (ringing): both sides stop ringing', ok);
      if (!ok) { await dump('caller', caller); await dump('callee', callee); }
      await sleep(caller, 8000);
      await liveSocket(caller, 60000); await liveSocket(callee, 60000);
      let works = 0;
      for (let i = 0; i < 4; i++) {
        try {
          await connectedCall(caller, callee);
          await hangUp(caller);
          await waitIdle(callee, 10000);
          works += 1;
        } catch (err) {
          console.log(`  call after Redis restart ${i + 1} failed: ${err.message.split('\n')[0]}`);
          await waitIdle(caller, 30000).catch(() => {}); await waitIdle(callee, 30000).catch(() => {});
        }
        await sleep(caller, 1000);
      }
      check('redisBlip: calls work again after Redis comes back', works === 4, `${works}/4`);
    }
  } catch (err) {
    console.error('Scenario aborted:', err.message.split('\n')[0]);
    results.push({ name: 'aborted', ok: false });
  }

  await browser.close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nSUMMARY: ${passed}/${results.length} passed`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
