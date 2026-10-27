'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { chatApi } from '../services/chat';
import { reconnectDelay } from '../lib/chatFormat.cjs';

// The server is the source of truth: live events only say "something changed",
// and every (re)connect plus a periodic tick reconciles over REST.
const RECONCILE_LIVE_MS = 60000;
const RECONCILE_OFFLINE_MS = 15000;
const TYPING_SEND_MS = 2000;
const TYPING_SHOW_MS = 4000;

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
    const { user, loading } = useAuth();
    // 'loading' until /chat/status answers; 'unavailable' when disabled, not configured or not a company user.
    const [availability, setAvailability] = useState('loading');
    const [live, setLive] = useState('off');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [syncState, setSyncState] = useState(null);
    const [typing, setTyping] = useState({});
    // Identifies this tab's socket to the server (call setup is routed to one tab).
    const [connId, setConnId] = useState(null);
    const [callsEnabled, setCallsEnabled] = useState(false);
    const [ringSeconds, setRingSeconds] = useState(null);

    const listeners = useRef(new Set());
    const activeRef = useRef(false);
    const wsRef = useRef(null);
    const wsUrlRef = useRef(null);
    const attemptRef = useRef(0);
    const reconnectTimer = useRef(null);
    const reconcileTimer = useRef(null);
    const lastReconcileAt = useRef(0);
    const lastTypingSent = useRef({});
    const typingTimers = useRef({});
    const connectRef = useRef(() => {});
    const myId = user?.id ?? null;
    const companyId = user?.company_id ?? null;

    const emit = useCallback((event) => {
        listeners.current.forEach((fn) => {
            try {
                fn(event);
            } catch (err) {
                console.error('chat listener failed', err);
            }
        });
    }, []);

    const subscribe = useCallback((fn) => {
        listeners.current.add(fn);
        return () => listeners.current.delete(fn);
    }, []);

    const reconcile = useCallback(async () => {
        if (!activeRef.current) return;
        lastReconcileAt.current = Date.now();
        try {
            const state = await chatApi.sync();
            if (!activeRef.current) return;
            setSyncState(state);
            setUnreadTotal(Number(state.unread_total) || 0);
            emit({ type: 'reconcile', state });
        } catch {
            // Next tick retries; a 401 is handled globally by the api client.
        }
    }, [emit]);

    const requestReconcile = useCallback(() => {
        clearTimeout(reconcileTimer.current);
        reconcileTimer.current = setTimeout(reconcile, 400);
    }, [reconcile]);

    const scheduleReconnect = useCallback(() => {
        if (!activeRef.current || !wsUrlRef.current) return;
        clearTimeout(reconnectTimer.current);
        const delay = reconnectDelay(attemptRef.current);
        attemptRef.current += 1;
        reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    }, []);

    const showTyping = useCallback((conversationId, userId) => {
        setTyping((prev) => ({ ...prev, [conversationId]: userId }));
        clearTimeout(typingTimers.current[conversationId]);
        typingTimers.current[conversationId] = setTimeout(() => {
            setTyping((prev) => {
                const next = { ...prev };
                delete next[conversationId];
                return next;
            });
        }, TYPING_SHOW_MS);
    }, []);

    const clearTyping = useCallback((conversationId) => {
        clearTimeout(typingTimers.current[conversationId]);
        setTyping((prev) => {
            if (!(conversationId in prev)) return prev;
            const next = { ...prev };
            delete next[conversationId];
            return next;
        });
    }, []);

    const connect = useCallback(async () => {
        if (!activeRef.current || !wsUrlRef.current) return;
        if (wsRef.current && wsRef.current.readyState <= 1) return;
        setLive('connecting');
        let ticket;
        try {
            ticket = (await chatApi.wsTicket()).ticket;
        } catch {
            setLive('off');
            scheduleReconnect();
            return;
        }
        if (!activeRef.current) return;
        // The reconnect timer and returning to the page can both start a connect() while the other
        // is still waiting for its ticket: only the first to get here opens a socket.
        if (wsRef.current && wsRef.current.readyState <= 1) return;
        let ws;
        try {
            ws = new WebSocket(wsUrlRef.current);
        } catch {
            setLive('off');
            scheduleReconnect();
            return;
        }
        wsRef.current = ws;
        ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', ticket }));
        ws.onmessage = (e) => {
            // A second socket in the same tab would deliver events out of order with this one.
            if (wsRef.current !== ws) {
                ws.close();
                return;
            }
            let event;
            try {
                event = JSON.parse(e.data);
            } catch {
                return;
            }
            if (event.type === 'ready') {
                attemptRef.current = 0;
                setConnId(event.conn_id || null);
                setLive('live');
                reconcile();
                return;
            }
            if (event.type === 'ping') return;
            if (event.type === 'typing') {
                showTyping(event.conversation_id, event.user_id);
            } else if (event.type === 'message.new') {
                clearTyping(event.conversation_id);
                requestReconcile();
            } else if (event.type === 'conversation.read') {
                requestReconcile();
            }
            emit(event);
        };
        ws.onclose = () => {
            if (wsRef.current !== ws) return;
            wsRef.current = null;
            setConnId(null);
            setLive('off');
            emit({ type: 'socket.closed' });
            scheduleReconnect();
        };
    }, [clearTyping, emit, reconcile, requestReconcile, scheduleReconnect, showTyping]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        if (loading) return undefined;
        if (!myId || !companyId) {
            setAvailability('unavailable');
            return undefined;
        }
        activeRef.current = true;
        let tick = null;

        chatApi.status()
            .then((status) => {
                if (!activeRef.current) return;
                setAvailability('ready');
                setCallsEnabled(Boolean(status.calls?.enabled && status.ws_url));
                setRingSeconds(Number(status.calls?.ring_seconds) || null);
                wsUrlRef.current = status.ws_url || null;
                reconcile();
                if (wsUrlRef.current) connectRef.current();
                tick = setInterval(() => {
                    const isLive = wsRef.current && wsRef.current.readyState === 1;
                    const due = isLive ? RECONCILE_LIVE_MS : RECONCILE_OFFLINE_MS;
                    if (Date.now() - lastReconcileAt.current >= due) reconcile();
                }, 5000);
            })
            .catch(() => {
                if (activeRef.current) setAvailability('unavailable');
            });

        const onVisible = () => {
            if (document.visibilityState !== 'visible' || !activeRef.current) return;
            reconcile();
            if (wsUrlRef.current && !wsRef.current) {
                attemptRef.current = 0;
                clearTimeout(reconnectTimer.current);
                connectRef.current();
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            activeRef.current = false;
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(tick);
            clearTimeout(reconnectTimer.current);
            clearTimeout(reconcileTimer.current);
            Object.values(typingTimers.current).forEach(clearTimeout);
            typingTimers.current = {};
            const ws = wsRef.current;
            wsRef.current = null;
            if (ws) ws.close();
            wsUrlRef.current = null;
            attemptRef.current = 0;
            setAvailability('loading');
            setLive('off');
            setUnreadTotal(0);
            setSyncState(null);
            setTyping({});
            setConnId(null);
            setCallsEnabled(false);
            setRingSeconds(null);
        };
    }, [loading, myId, companyId, reconcile]);

    const sendTyping = useCallback((conversationId) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== 1) return;
        const now = Date.now();
        if (now - (lastTypingSent.current[conversationId] || 0) < TYPING_SEND_MS) return;
        lastTypingSent.current[conversationId] = now;
        ws.send(JSON.stringify({ type: 'typing', conversation_id: conversationId }));
    }, []);

    /** Send a frame on this tab's chat socket. Returns false if the socket isn't open. */
    const sendFrame = useCallback((frame) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== 1) return false;
        ws.send(JSON.stringify(frame));
        return true;
    }, []);

    const value = useMemo(() => ({
        availability,
        enabled: availability === 'ready',
        live,
        myId,
        unreadTotal,
        syncState,
        typing,
        subscribe,
        reconcile,
        requestReconcile,
        sendTyping,
        sendFrame,
        connId,
        callsEnabled,
        ringSeconds,
    }), [availability, live, myId, unreadTotal, syncState, typing, subscribe, reconcile, requestReconcile, sendTyping, sendFrame, connId, callsEnabled, ringSeconds]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used within ChatProvider');
    return ctx;
}
