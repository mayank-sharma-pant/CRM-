'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';
import { useCall } from '../../contexts/CallContext';
import { endedMessage, formatCallDuration } from '../../lib/chatCalls.cjs';
import Avatar from './Avatar';

function useElapsed(startedAt, running) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [running]);
    return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

/** Shown once for the whole app, so a call keeps going while moving between CRM pages. */
export default function CallOverlay() {
    const t = useT();
    const { call, muted, accept, decline, hangUp, toggleMute } = useCall();
    const elapsed = useElapsed(call.startedAt, call.phase === 'active');

    if (call.phase === 'idle') return null;
    const name = call.peer?.full_name || t('Unknown');

    if (call.phase === 'incoming') {
        return (
            <div
                role="alertdialog"
                aria-live="assertive"
                aria-label={`${t('Incoming voice call')}: ${name}`}
                className="fixed bottom-4 right-4 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-surface p-4 shadow-2xl"
            >
                <div className="flex items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-primary">{name}</p>
                        <p className="text-[12px] text-muted">{t('Incoming voice call')}</p>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <button type="button" onClick={decline} className="btn h-10 flex-1 gap-2 bg-error text-white hover:opacity-90">
                        <PhoneOff size={16} /> {t('Decline')}
                    </button>
                    <button type="button" onClick={accept} className="btn h-10 flex-1 gap-2 bg-success text-white hover:opacity-90" autoFocus>
                        <Phone size={16} /> {t('Accept')}
                    </button>
                </div>
            </div>
        );
    }

    if (call.phase === 'ended') {
        const duration = call.startedAt && call.endedAt ? formatCallDuration((call.endedAt - call.startedAt) / 1000) : null;
        return (
            <div role="status" className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xl">
                <PhoneOff size={16} className="shrink-0 text-muted" />
                <p className="text-[13px] text-primary">
                    {t(endedMessage(call.reason, call.role))}
                    {duration && call.reason === 'completed' ? ` · ${duration}` : ''}
                </p>
            </div>
        );
    }

    const status = call.phase === 'outgoing'
        ? t('Calling…')
        : call.phase === 'connecting'
            ? t('Connecting…')
            : call.reconnecting
                ? t('Reconnecting…')
                : formatCallDuration(elapsed);

    return (
        <div role="region" aria-label={t('Voice call')} className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-2xl">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-primary">{name}</p>
                <p className="text-[12px] text-muted" aria-live="polite">{status}</p>
            </div>
            {call.phase === 'active' && (
                <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={muted}
                    aria-label={muted ? t('Unmute') : t('Mute')}
                    className={`btn h-10 w-10 shrink-0 p-0 ${muted ? 'bg-surface-elevated text-error' : 'btn-ghost'}`}
                >
                    {muted ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
            )}
            <button
                type="button"
                onClick={hangUp}
                aria-label={call.phase === 'outgoing' ? t('Cancel') : t('Hang up')}
                className="btn h-10 w-10 shrink-0 bg-error p-0 text-white hover:opacity-90"
            >
                <PhoneOff size={17} />
            </button>
        </div>
    );
}
