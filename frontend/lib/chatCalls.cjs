/**
 * Pure helpers for 1-to-1 voice calls (no React, no DOM) so they can be unit-tested with node --test.
 */

/** 7 → "0:07", 204 → "3:24", 3723 → "1:02:03". */
function formatCallDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * How a finished call reads in the chat for `viewerId`.
 * Returns { text, duration, missed, outgoing } — `text` is an English source string for t().
 */
function callEntryLabel(call, viewerId) {
  const outgoing = call.caller_id === viewerId;
  const notReached = ['missed', 'unavailable', 'busy', 'cancelled'];
  if (call.status === 'completed') {
    return { text: outgoing ? 'Outgoing voice call' : 'Incoming voice call', duration: formatCallDuration(call.duration_s), missed: false, outgoing };
  }
  if (!outgoing && notReached.includes(call.status)) {
    return { text: 'Missed voice call', duration: null, missed: true, outgoing };
  }
  const texts = {
    missed: 'No answer',
    unavailable: 'Not available',
    busy: 'Busy',
    cancelled: 'Cancelled call',
    declined: outgoing ? 'Call declined' : 'Declined call',
    failed: "Call couldn't connect",
    interrupted: 'Call ended',
  };
  return { text: texts[call.status] || 'Voice call', duration: null, missed: false, outgoing };
}

/**
 * From RTCPeerConnection.getStats(): 'relay' if the pair in use goes through a TURN relay,
 * 'direct' otherwise, or null if no pair has succeeded yet.
 *
 * The pair in use: the transport's selected pair (Chrome), a pair flagged `selected` (Firefox),
 * a nominated succeeded pair, or else — Safari reports none of those — the succeeded pair that
 * has carried the most data.
 */
function connectionFromStats(stats) {
  const byId = new Map();
  stats.forEach((report) => byId.set(report.id, report));
  let pair = null;
  byId.forEach((report) => {
    if (report.type === 'transport' && report.selectedCandidatePairId) pair = byId.get(report.selectedCandidatePairId) || pair;
  });
  if (!pair) {
    byId.forEach((report) => {
      if (!pair && report.type === 'candidate-pair' && report.selected) pair = report;
    });
  }
  if (!pair) {
    byId.forEach((report) => {
      if (!pair && report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) pair = report;
    });
  }
  if (!pair) {
    let busiest = -1;
    byId.forEach((report) => {
      if (report.type !== 'candidate-pair' || report.state !== 'succeeded') return;
      const bytes = (report.bytesReceived || 0) + (report.bytesSent || 0);
      if (bytes > busiest) {
        busiest = bytes;
        pair = report;
      }
    });
  }
  if (!pair) return null;
  const local = byId.get(pair.localCandidateId);
  const remote = byId.get(pair.remoteCandidateId);
  if (!local && !remote) return null;
  return [local, remote].some((c) => c && c.candidateType === 'relay') ? 'relay' : 'direct';
}

const IDLE = { phase: 'idle' };

/**
 * Call state machine. Phases: idle → outgoing | incoming → connecting → active → ended.
 * Events from the server only apply to the call they name, so stale events can't disturb a new call.
 */
function callReducer(state, action) {
  switch (action.type) {
    case 'dial':
      return state.phase === 'idle' || state.phase === 'ended'
        ? { phase: 'outgoing', callId: null, requestId: action.requestId, conversationId: action.conversationId, peer: action.peer, role: 'caller' }
        : state;
    case 'outgoing':
      return state.phase === 'outgoing' && state.requestId === action.requestId ? { ...state, callId: action.callId } : state;
    case 'incoming':
      return state.phase === 'idle' || state.phase === 'ended'
        ? { phase: 'incoming', callId: action.callId, conversationId: action.conversationId, peer: action.peer, role: 'callee' }
        : state;
    case 'accepting':
      return state.phase === 'incoming' && state.callId === action.callId ? { ...state, phase: 'connecting' } : state;
    case 'answered':
      return state.callId === action.callId && (state.phase === 'outgoing' || state.phase === 'connecting')
        ? { ...state, phase: 'connecting', answered: true }
        : state;
    case 'connected':
      return state.callId === action.callId && (state.phase === 'connecting' || state.phase === 'active')
        ? { ...state, phase: 'active', startedAt: state.startedAt || action.at, reconnecting: false }
        : state;
    case 'reconnecting':
      return state.callId === action.callId && state.phase === 'active' ? { ...state, reconnecting: action.value } : state;
    case 'taken':
      // Answered in another tab: a ringing tab, or a tab whose own answer lost the race
      // (connecting but never confirmed), steps aside. The tab that won ignores it.
      if (state.callId !== action.callId) return state;
      return state.phase === 'incoming' || (state.phase === 'connecting' && !state.answered) ? IDLE : state;
    case 'ended':
      if (action.callId != null && state.callId !== action.callId) return state;
      if (state.phase === 'idle') return state;
      return { phase: 'ended', callId: state.callId, peer: state.peer, role: state.role, reason: action.reason, startedAt: state.startedAt, endedAt: action.at };
    case 'error':
      if (state.phase !== 'outgoing' || (action.requestId && state.requestId !== action.requestId)) return state;
      return { phase: 'ended', callId: state.callId, peer: state.peer, role: state.role, reason: action.reason };
    case 'reset':
      return IDLE;
    default:
      return state;
  }
}

/** Short text shown when a call ends, from the end reason (server status or local error). */
function endedMessage(reason, role) {
  const caller = role === 'caller';
  const texts = {
    completed: 'Call ended',
    missed: caller ? 'No answer' : 'Missed call',
    unavailable: caller ? 'Not available right now' : 'Call ended',
    busy: 'Busy on another call',
    cancelled: caller ? 'Call cancelled' : 'Call ended',
    declined: 'Call declined',
    failed: "Couldn't connect the call",
    interrupted: 'Call ended',
    mic_blocked: 'Microphone blocked — allow microphone access in your browser to call',
    no_mic: 'No microphone found',
    mic_unavailable: "Microphone unavailable — check your browser's microphone settings",
    busy_self: 'You are already in a call',
    not_found: 'This chat is not available',
    deactivated: 'This person has been deactivated',
    rate_limited: 'Too many calls, please wait a moment',
    connection_lost: 'Connection lost — call ended',
  };
  return texts[reason] || 'Call ended';
}

module.exports = {
  IDLE,
  formatCallDuration,
  callEntryLabel,
  connectionFromStats,
  callReducer,
  endedMessage,
};
