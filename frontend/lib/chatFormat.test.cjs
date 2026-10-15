const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  initials,
  dayLabel,
  mergeMessages,
  groupMessages,
  reconnectDelay,
  roleLabel,
} = require("./chatFormat.cjs");

test("initials use first and last word", () => {
  assert.equal(initials("Suraj Kumar"), "SK");
  assert.equal(initials("  qa   sales  team "), "QT");
  assert.equal(initials("Mayank"), "M");
  assert.equal(initials(""), "?");
  assert.equal(initials(null), "?");
});

test("dayLabel says Today / Yesterday relative to now", () => {
  const now = new Date(2026, 9, 14, 12, 0, 0);
  assert.equal(dayLabel(new Date(2026, 9, 14, 8, 0), now), "Today");
  assert.equal(dayLabel(new Date(2026, 9, 13, 23, 59), now), "Yesterday");
  assert.equal(dayLabel("not a date", now), "");
});

test("mergeMessages orders by seq and drops duplicates", () => {
  const merged = mergeMessages(
    [{ seq: 2, client_msg_id: "b" }, { seq: 1, client_msg_id: "a" }],
    [{ seq: 2, client_msg_id: "b", body: "server" }, { seq: 3, client_msg_id: "c" }],
  );
  assert.deepEqual(merged.map((m) => m.seq), [1, 2, 3]);
  assert.equal(merged[1].body, "server");
});

test("mergeMessages replaces a pending message once the server copy arrives", () => {
  const pending = { client_msg_id: "x", body: "hi", status: "sending" };
  const stillPending = mergeMessages([{ seq: 1, client_msg_id: "a" }], [pending]);
  assert.equal(stillPending.length, 2);
  assert.equal(stillPending[1].status, "sending");
  const confirmed = mergeMessages(stillPending, [{ seq: 2, client_msg_id: "x", body: "hi" }]);
  assert.deepEqual(confirmed.map((m) => m.seq), [1, 2]);
  assert.equal(confirmed.some((m) => m.status === "sending"), false);
});

test("mergeMessages keeps one copy of a retried pending message", () => {
  const p = { client_msg_id: "r", status: "failed" };
  assert.equal(mergeMessages([p], [{ ...p, status: "sending" }]).length, 1);
});

test("groupMessages splits by day, sender and 5-minute gaps", () => {
  const t = (h, m) => new Date(2026, 9, 14, h, m).toISOString();
  const days = groupMessages([
    { seq: 1, sender_id: 1, created_at: t(9, 0) },
    { seq: 2, sender_id: 1, created_at: t(9, 3) },
    { seq: 3, sender_id: 1, created_at: t(9, 9) },
    { seq: 4, sender_id: 2, created_at: t(9, 10) },
    { seq: 5, sender_id: 2, created_at: new Date(2026, 9, 15, 9, 0).toISOString() },
  ]);
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].runs.map((r) => r.messages.map((m) => m.seq)), [[1, 2], [3], [4]]);
  assert.deepEqual(days[1].runs.map((r) => r.messages.map((m) => m.seq)), [[5]]);
});

test("reconnectDelay backs off exponentially and caps at 30s", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 20].map(reconnectDelay), [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  assert.equal(reconnectDelay(-3), 1000);
});

test("roleLabel maps known roles", () => {
  assert.equal(roleLabel("md"), "MD");
  assert.equal(roleLabel("unknown"), "unknown");
});
