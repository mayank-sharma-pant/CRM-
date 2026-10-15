'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';
import { chatApi, apiErrorMessage } from '../../services/chat';
import { roleLabel } from '../../lib/chatFormat.cjs';
import Avatar from './Avatar';

export default function NewChatDialog({ open, onClose, onStarted }) {
    const t = useT();
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [state, setState] = useState('idle');
    const [error, setError] = useState(null);
    const [startingId, setStartingId] = useState(null);
    const reqId = useRef(0);

    useEffect(() => {
        if (!open) return undefined;
        setQ('');
        setResults([]);
        setError(null);
        setStartingId(null);
        return undefined;
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const id = ++reqId.current;
        setState('loading');
        const timer = setTimeout(() => {
            chatApi.directory(q.trim(), 30)
                .then((items) => {
                    if (id !== reqId.current) return;
                    setResults(items);
                    setState('ready');
                })
                .catch((err) => {
                    if (id !== reqId.current) return;
                    setError(apiErrorMessage(err, t('Could not load people.')));
                    setState('error');
                });
        }, 250);
        return () => clearTimeout(timer);
    }, [open, q, t]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const start = async (person) => {
        setStartingId(person.id);
        setError(null);
        try {
            const conversation = await chatApi.startDirect(person.id);
            onStarted(conversation);
        } catch (err) {
            setError(apiErrorMessage(err, t('Could not start the chat.')));
            setStartingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-chat-title"
                className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h2 id="new-chat-title" className="text-[15px] font-semibold text-primary">{t('New chat')}</h2>
                    <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-primary" aria-label={t('Close')}>
                        <X size={16} />
                    </button>
                </div>
                <div className="border-b border-border px-4 py-3">
                    <label className="relative block">
                        <span className="sr-only">{t('Search people')}</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            maxLength={100}
                            placeholder={t('Search people')}
                            className="input w-full pl-9"
                        />
                    </label>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                    {state === 'loading' && results.length === 0 && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-accent" aria-label={t('Loading')} />
                        </div>
                    )}
                    {state === 'error' && (
                        <p className="px-4 py-8 text-center text-[13px] text-error">{error}</p>
                    )}
                    {state === 'ready' && results.length === 0 && (
                        <p className="px-4 py-8 text-center text-[13px] text-muted">{t('No people found')}</p>
                    )}
                    {results.length > 0 && (
                        <ul className="divide-y divide-border/60">
                            {results.map((person) => (
                                <li key={person.id}>
                                    <button
                                        type="button"
                                        disabled={startingId !== null}
                                        onClick={() => start(person)}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-elevated disabled:opacity-60"
                                    >
                                        <Avatar name={person.full_name} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-primary">{person.full_name}</span>
                                            <span className="block truncate text-[12px] text-muted">
                                                {t(roleLabel(person.role))}{person.team ? ` · ${person.team}` : ''}
                                            </span>
                                        </span>
                                        {startingId === person.id && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {error && state !== 'error' && (
                        <p className="px-4 py-3 text-[12px] text-error">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
