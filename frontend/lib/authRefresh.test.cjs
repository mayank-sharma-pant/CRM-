const { test } = require("node:test");
const assert = require("node:assert/strict");
const { LOCK_NAME, shouldRenew, createRenewer } = require("./authRefresh.cjs");

const err = (url, status = 401, extra = {}) => ({
  config: { url, ...extra },
  response: status === null ? undefined : { status },
});

test("shouldRenew: an expired login on a normal request", () => {
  assert.equal(shouldRenew(err("/auth/me")), true);
  assert.equal(shouldRenew(err("/leads?page=2")), true);
  assert.equal(shouldRenew(err("/chat/ws-ticket")), true);
  assert.equal(shouldRenew(err("/auth/2fa/status")), true);
  assert.equal(shouldRenew(err("/auth/change-password")), true);
});

test("shouldRenew: never for login, refresh, logout or 2FA verify", () => {
  for (const url of ["/auth/login", "/auth/login-otp", "/auth/refresh", "/auth/refresh?x=1", "/auth/logout", "/auth/2fa/verify"]) {
    assert.equal(shouldRenew(err(url)), false, url);
  }
});

test("shouldRenew: only 401, only once, only with a request", () => {
  assert.equal(shouldRenew(err("/leads", 403)), false);
  assert.equal(shouldRenew(err("/leads", 500)), false);
  assert.equal(shouldRenew(err("/leads", null)), false);
  assert.equal(shouldRenew(err("/leads", 401, { _authRetried: true })), false);
  assert.equal(shouldRenew({ response: { status: 401 } }), false);
  assert.equal(shouldRenew(undefined), false);
});

test("createRenewer: parallel 401s share one refresh", async () => {
  let calls = 0;
  let release;
  const renew = createRenewer({ refresh: () => { calls += 1; return new Promise((r) => { release = r; }); } });
  const all = Promise.all([renew(), renew(), renew(), renew(), renew()]);
  await new Promise((r) => setImmediate(r));
  release("ok");
  assert.deepEqual(await all, ["ok", "ok", "ok", "ok", "ok"]);
  assert.equal(calls, 1);
});

test("createRenewer: a later expiry refreshes again", async () => {
  let calls = 0;
  const renew = createRenewer({ refresh: async () => { calls += 1; } });
  await renew();
  await renew();
  assert.equal(calls, 2);
});

test("createRenewer: a failed refresh rejects every waiter and the next call tries again", async () => {
  let calls = 0;
  const renew = createRenewer({ refresh: async () => { calls += 1; if (calls === 1) throw new Error("401"); } });
  const results = await Promise.allSettled([renew(), renew()]);
  assert.deepEqual(results.map((r) => r.status), ["rejected", "rejected"]);
  assert.equal(calls, 1);
  await renew();
  assert.equal(calls, 2);
});

function fakeLocks() {
  let queue = Promise.resolve();
  const names = [];
  return {
    names,
    request(name, fn) {
      names.push(name);
      const run = queue.then(() => fn());
      queue = run.catch(() => {});
      return run;
    },
  };
}

test("createRenewer: two tabs never refresh at the same time", async () => {
  const locks = fakeLocks();
  let active = 0;
  let maxActive = 0;
  const order = [];
  const refreshAs = (tab) => async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    order.push(`${tab} start`);
    await new Promise((r) => setTimeout(r, 20));
    order.push(`${tab} end`);
    active -= 1;
  };
  const tabA = createRenewer({ refresh: refreshAs("A"), locks });
  const tabB = createRenewer({ refresh: refreshAs("B"), locks });
  await Promise.all([tabA(), tabB(), tabA(), tabB()]);
  assert.equal(maxActive, 1);
  assert.deepEqual(order, ["A start", "A end", "B start", "B end"]);
  assert.deepEqual(locks.names, [LOCK_NAME, LOCK_NAME]);
});

test("createRenewer: a failed refresh in one tab does not block the other", async () => {
  const locks = fakeLocks();
  const tabA = createRenewer({ refresh: async () => { throw new Error("401"); }, locks });
  const tabB = createRenewer({ refresh: async () => "ok", locks });
  const [a, b] = await Promise.allSettled([tabA(), tabB()]);
  assert.equal(a.status, "rejected");
  assert.equal(b.value, "ok");
});
