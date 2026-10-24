const { test } = require("node:test");
const assert = require("node:assert/strict");
const { IDLE, formatCallDuration, callEntryLabel, connectionFromStats, callReducer, endedMessage } = require("./chatCalls.cjs");

test("formatCallDuration", () => {
  assert.equal(formatCallDuration(7), "0:07");
  assert.equal(formatCallDuration(204), "3:24");
  assert.equal(formatCallDuration(3723), "1:02:03");
  assert.equal(formatCallDuration(null), "0:00");
});

test("callEntryLabel reads from each side", () => {
  const call = (status, extra = {}) => ({ caller_id: 1, callee_id: 2, status, duration_s: null, ...extra });
  assert.deepEqual(callEntryLabel(call("completed", { duration_s: 204 }), 1), { text: "Outgoing voice call", duration: "3:24", missed: false, outgoing: true });
  assert.equal(callEntryLabel(call("completed", { duration_s: 5 }), 2).text, "Incoming voice call");
  for (const status of ["missed", "unavailable", "busy", "cancelled"]) {
    assert.deepEqual(callEntryLabel(call(status), 2), { text: "Missed voice call", duration: null, missed: true, outgoing: false }, status);
  }
  assert.equal(callEntryLabel(call("missed"), 1).text, "No answer");
  assert.equal(callEntryLabel(call("busy"), 1).text, "Busy");
  assert.equal(callEntryLabel(call("declined"), 1).text, "Call declined");
  assert.equal(callEntryLabel(call("declined"), 2).text, "Declined call");
  assert.equal(callEntryLabel(call("failed"), 2).text, "Call couldn't connect");
  assert.equal(callEntryLabel(call("interrupted"), 1).text, "Call ended");
});

function stats(entries) {
  return new Map(entries.map((e) => [e.id, e]));
}

test("connectionFromStats uses the selected pair", () => {
  const base = [
    { id: "L1", type: "local-candidate", candidateType: "srflx" },
    { id: "R1", type: "remote-candidate", candidateType: "host" },
    { id: "L2", type: "local-candidate", candidateType: "relay" },
    { id: "P1", type: "candidate-pair", localCandidateId: "L1", remoteCandidateId: "R1", state: "succeeded", nominated: true },
    { id: "P2", type: "candidate-pair", localCandidateId: "L2", remoteCandidateId: "R1", state: "succeeded", nominated: true },
  ];
  assert.equal(connectionFromStats(stats([...base, { id: "T", type: "transport", selectedCandidatePairId: "P1" }])), "direct");
  assert.equal(connectionFromStats(stats([...base, { id: "T", type: "transport", selectedCandidatePairId: "P2" }])), "relay");
  assert.equal(connectionFromStats(stats(base.slice(0, 4))), "direct");
  assert.equal(connectionFromStats(stats([{ id: "L1", type: "local-candidate", candidateType: "host" }])), null);
});

test("callReducer: outgoing call lifecycle", () => {
  let s = callReducer(IDLE, { type: "dial", requestId: "r1", conversationId: 5, peer: { id: 2 } });
  assert.equal(s.phase, "outgoing");
  s = callReducer(s, { type: "outgoing", requestId: "other", callId: 9 });
  assert.equal(s.callId, null);
  s = callReducer(s, { type: "outgoing", requestId: "r1", callId: 9 });
  assert.equal(s.callId, 9);
  s = callReducer(s, { type: "answered", callId: 9 });
  assert.equal(s.phase, "connecting");
  s = callReducer(s, { type: "connected", callId: 9, at: 1000 });
  assert.equal(s.phase, "active");
  assert.equal(s.startedAt, 1000);
  s = callReducer(s, { type: "connected", callId: 9, at: 5000 });
  assert.equal(s.startedAt, 1000);
  s = callReducer(s, { type: "ended", callId: 8, reason: "completed" });
  assert.equal(s.phase, "active");
  s = callReducer(s, { type: "ended", callId: 9, reason: "completed", at: 9000 });
  assert.equal(s.phase, "ended");
  assert.equal(s.reason, "completed");
});

test("callReducer: incoming call, taken elsewhere, no second call while busy", () => {
  let s = callReducer(IDLE, { type: "incoming", callId: 3, conversationId: 1, peer: { id: 1 } });
  assert.equal(s.phase, "incoming");
  assert.equal(callReducer(s, { type: "incoming", callId: 4, conversationId: 2, peer: { id: 7 } }).callId, 3);
  assert.equal(callReducer(s, { type: "dial", requestId: "x" }).phase, "incoming");
  assert.equal(callReducer(s, { type: "taken", callId: 3 }), IDLE);
  s = callReducer(s, { type: "accepting", callId: 3 });
  assert.equal(s.phase, "connecting");
  assert.equal(callReducer(s, { type: "taken", callId: 3 }).phase, "connecting");
});

test("callReducer: errors only end the matching outgoing attempt", () => {
  const s = callReducer(IDLE, { type: "dial", requestId: "r1", conversationId: 5, peer: { id: 2 } });
  assert.equal(callReducer(s, { type: "error", requestId: "r2", reason: "busy_self" }).phase, "outgoing");
  const e = callReducer(s, { type: "error", requestId: "r1", reason: "busy_self" });
  assert.equal(e.phase, "ended");
  assert.equal(e.reason, "busy_self");
  assert.equal(callReducer(e, { type: "reset" }), IDLE);
});

test("endedMessage", () => {
  assert.equal(endedMessage("missed", "caller"), "No answer");
  assert.equal(endedMessage("missed", "callee"), "Missed call");
  assert.match(endedMessage("mic_blocked", "caller"), /Microphone blocked/);
  assert.equal(endedMessage("no_mic", "caller"), "No microphone found");
  assert.match(endedMessage("mic_unavailable", "caller"), /Microphone unavailable/);
  assert.equal(endedMessage("something-new", "caller"), "Call ended");
});
