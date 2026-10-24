'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useChat } from './ChatContext';
import { chatApi } from '../services/chat';
import { IDLE, callReducer, connectionFromStats } from '../lib/chatCalls.cjs';

// The audio goes browser-to-browser (WebRTC). The server only relays call setup over the
// chat socket. A page reload, a closed tab or a dropped chat connection ends the call.
const CONNECT_TIMEOUT_MS = 15000;
const ENDED_VISIBLE_MS = 3500;

const CallContext = createContext(null);

function requestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function openMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('no microphone'), { reason: 'mic_unavailable' });
    }
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
        });
    } catch (err) {
        const reason = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
            ? 'mic_blocked'
            : err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError'
                ? 'no_mic'
                : 'mic_unavailable';
        throw Object.assign(new Error('microphone unavailable'), { reason });
    }
}

/** A soft two-beep ring made with Web Audio (no sound file). Browsers may keep it silent until the page has been clicked. */
function createRingtone() {
    let ctx = null;
    let timer = null;
    const beep = () => {
        if (!ctx) return;
        [0, 0.25].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 480;
            gain.gain.value = 0.05;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + 0.18);
        });
    };
    return {
        start() {
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                ctx = ctx || new Ctx();
                ctx.resume?.().catch(() => {});
                clearInterval(timer);
                beep();
                timer = setInterval(beep, 2000);
            } catch {
                // No sound; the incoming-call card is still shown.
            }
        },
        stop() {
            clearInterval(timer);
            timer = null;
        },
    };
}

export function CallProvider({ children }) {
    const { subscribe, sendFrame, callsEnabled, live, myId } = useChat();
    const [call, dispatch] = useReducer(callReducer, IDLE);
    const [muted, setMuted] = useState(false);

    const callRef = useRef(call);
    callRef.current = call;
    const pcRef = useRef(null);
    const streamRef = useRef(null);
    const iceRef = useRef([]);
    const audioRef = useRef(null);
    const pendingIce = useRef([]);
    const failTimer = useRef(null);
    const resetTimer = useRef(null);
    const reported = useRef(false);
    // Cancel pressed before the server named the call: cancel it as soon as it does.
    const cancelRequest = useRef(null);
    // Set the moment the server confirms this tab answered/connected the call. A ref, not state:
    // "answered" and "taken" can arrive back to back before React re-renders.
    const answeredHere = useRef(null);
    // The call this tab is currently accepting; cleared by release() if it lost or ended meanwhile.
    const accepting = useRef(null);
    const ringtone = useRef(null);

    useEffect(() => {
        ringtone.current = createRingtone();
        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
    }, []);

    /** Release everything: microphone, peer connection, ringtone, timers. */
    const release = useCallback(() => {
        clearTimeout(failTimer.current);
        ringtone.current?.stop();
        const pc = pcRef.current;
        pcRef.current = null;
        if (pc) {
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.onconnectionstatechange = null;
            try {
                pc.close();
            } catch {
                // already closed
            }
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (audioRef.current) audioRef.current.srcObject = null;
        pendingIce.current = [];
        reported.current = false;
        answeredHere.current = null;
        accepting.current = null;
        setMuted(false);
    }, []);

    const showEnded = useCallback((reason, callId) => {
        release();
        dispatch({ type: 'ended', callId, reason, at: Date.now() });
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => dispatch({ type: 'reset' }), ENDED_VISIBLE_MS);
    }, [release]);

    const failCall = useCallback((callId) => {
        sendFrame({ type: 'call.report', call_id: callId, connection: 'failed' });
        showEnded('failed', callId);
    }, [sendFrame, showEnded]);

    const armConnectTimeout = useCallback((callId) => {
        clearTimeout(failTimer.current);
        failTimer.current = setTimeout(() => {
            if (pcRef.current?.connectionState !== 'connected') failCall(callId);
        }, CONNECT_TIMEOUT_MS);
    }, [failCall]);

    const reportConnection = useCallback(async (pc, callId) => {
        if (reported.current || callRef.current.role !== 'caller') return;
        reported.current = true;
        try {
            const connection = connectionFromStats(await pc.getStats());
            if (connection) sendFrame({ type: 'call.report', call_id: callId, connection });
        } catch {
            reported.current = false;
        }
    }, [sendFrame]);

    const createPeer = useCallback((callId) => {
        const pc = new RTCPeerConnection({ iceServers: iceRef.current });
        pcRef.current = pc;
        streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current));
        pc.onicecandidate = (e) => {
            if (e.candidate) sendFrame({ type: 'call.signal', call_id: callId, data: { kind: 'ice', candidate: e.candidate.toJSON() } });
        };
        pc.ontrack = (e) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.srcObject = e.streams[0] || new MediaStream([e.track]);
            audio.play().catch(() => {});
        };
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === 'connected') {
                clearTimeout(failTimer.current);
                dispatch({ type: 'connected', callId, at: Date.now() });
                reportConnection(pc, callId);
            } else if (state === 'disconnected') {
                dispatch({ type: 'reconnecting', callId, value: true });
                armConnectTimeout(callId);
            } else if (state === 'failed') {
                failCall(callId);
            }
        };
        armConnectTimeout(callId);
        return pc;
    }, [armConnectTimeout, failCall, reportConnection, sendFrame]);

    const flushIce = useCallback((pc) => {
        const queued = pendingIce.current;
        pendingIce.current = [];
        queued.forEach((candidate) => pc.addIceCandidate(candidate).catch(() => {}));
    }, []);

    const handleSignal = useCallback(async (event) => {
        const pc = pcRef.current;
        const callId = event.call_id;
        if (!pc || callRef.current.callId !== callId) return;
        const data = event.data || {};
        try {
            if (data.kind === 'offer' && typeof data.sdp === 'string') {
                await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
                flushIce(pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendFrame({ type: 'call.signal', call_id: callId, data: { kind: 'answer', sdp: answer.sdp } });
            } else if (data.kind === 'answer' && typeof data.sdp === 'string') {
                await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
                flushIce(pc);
            } else if (data.kind === 'ice' && data.candidate) {
                if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
                else pendingIce.current.push(data.candidate);
            }
        } catch {
            failCall(callId);
        }
    }, [failCall, flushIce, sendFrame]);

    useEffect(() => subscribe((event) => {
        const current = callRef.current;
        switch (event.type) {
            case 'call.outgoing':
                if (cancelRequest.current && cancelRequest.current === event.request_id) {
                    cancelRequest.current = null;
                    sendFrame({ type: 'call.cancel', call_id: event.call_id });
                } else if (current.phase === 'outgoing' && current.requestId === event.request_id) {
                    dispatch({ type: 'outgoing', requestId: event.request_id, callId: event.call_id });
                }
                break;
            case 'call.incoming':
                if (current.phase === 'idle' || current.phase === 'ended') {
                    clearTimeout(resetTimer.current);
                    dispatch({ type: 'incoming', callId: event.call_id, conversationId: event.conversation_id, peer: event.caller });
                    ringtone.current?.start();
                }
                break;
            case 'call.taken':
                // Answered in another tab. If this tab was still ringing, or had pressed Accept but
                // lost the race, close quietly and free the microphone — never report a failure
                // against the call the other tab is now in.
                if (current.callId === event.call_id && answeredHere.current !== event.call_id
                    && (current.phase === 'incoming' || current.phase === 'connecting')) {
                    release();
                    dispatch({ type: 'taken', callId: event.call_id });
                }
                break;
            case 'call.answered':
                if (current.callId !== event.call_id) break;
                answeredHere.current = event.call_id;
                dispatch({ type: 'answered', callId: event.call_id });
                if (current.role === 'caller' && streamRef.current) {
                    (async () => {
                        try {
                            const pc = createPeer(event.call_id);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            sendFrame({ type: 'call.signal', call_id: event.call_id, data: { kind: 'offer', sdp: offer.sdp } });
                        } catch {
                            failCall(event.call_id);
                        }
                    })();
                }
                break;
            case 'call.signal':
                handleSignal(event);
                break;
            case 'call.ended':
                if (current.callId === event.call_id && current.phase !== 'idle') showEnded(event.status, event.call_id);
                break;
            case 'call.error':
                if (current.phase === 'outgoing' && current.requestId === event.request_id) {
                    release();
                    dispatch({ type: 'error', requestId: event.request_id, reason: event.code });
                    clearTimeout(resetTimer.current);
                    resetTimer.current = setTimeout(() => dispatch({ type: 'reset' }), ENDED_VISIBLE_MS);
                }
                break;
            case 'socket.closed':
                if (current.phase !== 'idle' && current.phase !== 'ended') showEnded('connection_lost', current.callId);
                break;
            default:
                break;
        }
    }), [subscribe, sendFrame, createPeer, handleSignal, failCall, release, showEnded]);

    // Logging out (or switching user) ends any call and frees the microphone.
    useEffect(() => () => {
        release();
        clearTimeout(resetTimer.current);
        dispatch({ type: 'reset' });
    }, [myId, release]);

    const startCall = useCallback(async (conversation) => {
        const current = callRef.current;
        if (!callsEnabled || live !== 'live' || (current.phase !== 'idle' && current.phase !== 'ended')) return;
        clearTimeout(resetTimer.current);
        const rid = requestId();
        dispatch({ type: 'dial', requestId: rid, conversationId: conversation.id, peer: conversation.other_user });
        try {
            streamRef.current = await openMicrophone();
            iceRef.current = await chatApi.iceServers();
        } catch (err) {
            release();
            dispatch({ type: 'error', requestId: rid, reason: err?.reason || 'failed' });
            resetTimer.current = setTimeout(() => dispatch({ type: 'reset' }), ENDED_VISIBLE_MS);
            return;
        }
        if (callRef.current.requestId !== rid || callRef.current.phase !== 'outgoing') {
            // Cancelled while the microphone prompt was open: nothing was sent yet.
            if (cancelRequest.current === rid) cancelRequest.current = null;
            release();
            return;
        }
        if (!sendFrame({ type: 'call.invite', conversation_id: conversation.id, request_id: rid })) {
            showEnded('connection_lost', null);
        }
    }, [callsEnabled, live, release, sendFrame, showEnded]);

    const accept = useCallback(async () => {
        const current = callRef.current;
        if (current.phase !== 'incoming') return;
        ringtone.current?.stop();
        accepting.current = current.callId;
        dispatch({ type: 'accepting', callId: current.callId });
        try {
            const stream = await openMicrophone();
            if (accepting.current !== current.callId) {
                // Taken by another tab or ended while the microphone prompt was open.
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            iceRef.current = await chatApi.iceServers();
            if (accepting.current !== current.callId) return;
            createPeer(current.callId);
        } catch (err) {
            if (accepting.current !== current.callId) return;
            sendFrame({ type: 'call.decline', call_id: current.callId });
            showEnded(err?.reason || 'failed', current.callId);
            return;
        }
        if (!sendFrame({ type: 'call.accept', call_id: current.callId })) showEnded('connection_lost', current.callId);
    }, [createPeer, sendFrame, showEnded]);

    const decline = useCallback(() => {
        const current = callRef.current;
        if (current.phase !== 'incoming') return;
        sendFrame({ type: 'call.decline', call_id: current.callId });
        ringtone.current?.stop();
        dispatch({ type: 'reset' });
    }, [sendFrame]);

    const hangUp = useCallback(() => {
        const current = callRef.current;
        if (current.phase === 'outgoing') {
            if (current.callId) sendFrame({ type: 'call.cancel', call_id: current.callId });
            else cancelRequest.current = current.requestId;
            showEnded('cancelled', current.callId);
        } else if (current.phase === 'connecting' || current.phase === 'active') {
            sendFrame({ type: 'call.hangup', call_id: current.callId });
            showEnded('completed', current.callId);
        }
    }, [sendFrame, showEnded]);

    const toggleMute = useCallback(() => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setMuted(!track.enabled);
    }, []);

    const value = useMemo(() => ({
        call,
        muted,
        canCall: callsEnabled && live === 'live' && (call.phase === 'idle' || call.phase === 'ended'),
        callsEnabled,
        startCall,
        accept,
        decline,
        hangUp,
        toggleMute,
    }), [call, muted, callsEnabled, live, startCall, accept, decline, hangUp, toggleMute]);

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within CallProvider');
    return ctx;
}
