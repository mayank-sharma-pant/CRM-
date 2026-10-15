'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessagesSquare, Search, SquarePen, WifiOff } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';
import { useChat } from '../../contexts/ChatContext';
import { chatApi, apiErrorMessage } from '../../services/chat';
import { listTimeLabel, roleLabel } from '../../lib/chatFormat.cjs';
import Avatar from './Avatar';
import MessageThread from './MessageThread';
import NewChatDialog from './NewChatDialog';

const PRESENCE_MS = 30000;

export default function ChatPage() {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { availability, live, myId, typing, subscribe } = useChat();

    const [items, setItems] = useState([]);
    const [listState, setListState] = useState('loading');
    const [listError, setListError] = useState(null);
    const [filter, setFilter] = useState('');
    const [online, setOnline] = useState(() => new Set());
    const [newOpen, setNewOpen] = useState(false);
    const [maxChars, setMaxChars] = useState(4000);
    const [extra, setExtra] = useState(null);
    const reloadTimer = useRef(null);
    const listReq = useRef(0);

    const selectedId = Number(searchParams.get('c')) || null;

    const select = useCallback((id) => {
        router.replace(id ? `/chat?c=${id}` : '/chat', { scroll: false });
    }, [router]);

    const loadList = useCallback(async ({ silent } = {}) => {
        const id = ++listReq.current;
        if (!silent) setListState('loading');
        try {
            const data = await chatApi.conversations(0, 100);
            if (id !== listReq.current) return;
            setItems(data.items);
            setListState('ready');
            setListError(null);
        } catch (err) {
            if (id !== listReq.current) return;
            if (!silent) {
                setListError(apiErrorMessage(err, t('Could not load chats.')));
                setListState('error');
            }
        }
    }, [t]);

    useEffect(() => {
        if (availability !== 'ready') return;
        loadList();
        chatApi.status().then((s) => setMaxChars(s.max_body_chars || 4000)).catch(() => {});
    }, [availability, loadList]);

    const scheduleReload = useCallback(() => {
        clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => loadList({ silent: true }), 300);
    }, [loadList]);

    useEffect(() => subscribe((event) => {
        if (event.type === 'message.new' || event.type === 'conversation.read' || event.type === 'reconcile') {
            scheduleReload();
        }
    }), [subscribe, scheduleReload]);

    useEffect(() => () => clearTimeout(reloadTimer.current), []);

    const otherIds = useMemo(
        () => items.map((c) => c.other_user?.id).filter(Boolean).slice(0, 200),
        [items],
    );
    const otherIdsKey = otherIds.join(',');

    useEffect(() => {
        if (availability !== 'ready' || !otherIdsKey) return undefined;
        let cancelled = false;
        const refresh = () => chatApi.presence(otherIdsKey.split(',').map(Number))
            .then((ids) => {
                if (!cancelled) setOnline(new Set(ids));
            })
            .catch(() => {});
        refresh();
        const timer = setInterval(refresh, PRESENCE_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [availability, otherIdsKey]);

    const listed = items.find((c) => c.id === selectedId) || null;
    useEffect(() => {
        if (!selectedId || listed || listState !== 'ready') {
            if (!selectedId) setExtra(null);
            return;
        }
        let cancelled = false;
        chatApi.conversation(selectedId)
            .then((c) => {
                if (!cancelled) setExtra(c);
            })
            .catch(() => {
                if (!cancelled) {
                    setExtra(null);
                    select(null);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [selectedId, listed, listState, select]);
    const selected = listed || (extra && extra.id === selectedId ? extra : null);

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return items;
        return items.filter((c) => (c.other_user?.full_name || '').toLowerCase().includes(q));
    }, [items, filter]);

    if (availability === 'loading') {
        return (
            <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-page">
                <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label={t('Loading')} />
            </div>
        );
    }

    if (availability === 'unavailable') {
        return (
            <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-2 bg-page px-6 text-center">
                <MessagesSquare className="h-8 w-8 text-muted" />
                <p className="text-[14px] font-semibold text-primary">{t('Chat is not available')}</p>
                <p className="max-w-sm text-[13px] text-muted">{t('Chat is available to company users when it has been turned on for your workspace.')}</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-56px)] min-h-0 bg-page">
            <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full min-h-0 flex-col border-r border-border bg-surface md:w-80 md:shrink-0`}>
                <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <h1 className="text-[17px] font-bold tracking-tight text-primary">{t('Chat')}</h1>
                    <button type="button" onClick={() => setNewOpen(true)} className="btn btn-primary h-8 gap-1.5 px-2.5 text-[12px]">
                        <SquarePen size={14} /> {t('New chat')}
                    </button>
                </div>
                <div className="px-4 pb-3">
                    <label className="relative block">
                        <span className="sr-only">{t('Search conversations')}</span>
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={t('Search conversations')}
                            className="input h-9 w-full pl-8 text-[13px]"
                        />
                    </label>
                </div>
                {live !== 'live' && (
                    <p className="mx-4 mb-2 inline-flex items-center gap-1.5 rounded border border-border bg-surface-elevated px-2 py-1 text-[11px] text-muted" role="status">
                        <WifiOff size={12} /> {t('Live updates paused — messages refresh every few seconds.')}
                    </p>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {listState === 'loading' && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-accent" aria-label={t('Loading')} />
                        </div>
                    )}
                    {listState === 'error' && (
                        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                            <p className="text-[13px] text-error">{listError}</p>
                            <button type="button" onClick={() => loadList()} className="btn btn-primary">{t('Retry')}</button>
                        </div>
                    )}
                    {listState === 'ready' && items.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                            <MessagesSquare className="h-7 w-7 text-muted" />
                            <p className="text-[13px] font-semibold text-primary">{t('No conversations yet')}</p>
                            <p className="text-[12px] text-muted">{t('Start a conversation with anyone in your company.')}</p>
                        </div>
                    )}
                    {listState === 'ready' && items.length > 0 && visible.length === 0 && (
                        <p className="px-4 py-8 text-center text-[13px] text-muted">{t('No people found')}</p>
                    )}
                    <ul>
                        {visible.map((c) => {
                            const other = c.other_user;
                            const active = c.id === selectedId;
                            const isTyping = typing[c.id] === other?.id;
                            const last = c.last_message;
                            const preview = isTyping
                                ? t('typing…')
                                : last
                                    ? `${last.sender_id === myId ? `${t('You')}: ` : ''}${last.preview ?? t('Message unavailable')}`
                                    : t('No messages yet');
                            return (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        onClick={() => select(c.id)}
                                        aria-current={active ? 'true' : undefined}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-accent/10' : 'hover:bg-surface-elevated'}`}
                                    >
                                        <Avatar name={other?.full_name} online={online.has(other?.id)} inactive={!other?.is_active} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-baseline justify-between gap-2">
                                                <span className={`truncate text-[13px] ${c.unread ? 'font-bold' : 'font-semibold'} text-primary`}>
                                                    {other?.full_name || '—'}
                                                </span>
                                                <span className="shrink-0 text-[11px] text-muted">{c.last_message_at ? listTimeLabel(c.last_message_at) : ''}</span>
                                            </span>
                                            <span className="mt-0.5 flex items-center justify-between gap-2">
                                                <span className={`truncate text-[12px] ${isTyping ? 'text-accent' : c.unread ? 'text-primary' : 'text-muted'}`}>
                                                    {preview}
                                                </span>
                                                {c.unread > 0 && (
                                                    <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-inverse">
                                                        {c.unread > 99 ? '99+' : c.unread}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-muted">
                                                {other?.is_active ? t(roleLabel(other?.role)) : t('Deactivated')}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>

            <section className={`${selected ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}>
                {selected ? (
                    <MessageThread
                        key={selected.id}
                        conversation={selected}
                        online={online.has(selected.other_user?.id)}
                        maxChars={maxChars}
                        onBack={() => select(null)}
                        onActivity={scheduleReload}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                        <MessagesSquare className="h-9 w-9 text-muted" />
                        <p className="text-[14px] font-semibold text-primary">{t('Select a chat')}</p>
                        <p className="text-[13px] text-muted">{t('Messages are private to the two people in each chat.')}</p>
                    </div>
                )}
            </section>

            <NewChatDialog
                open={newOpen}
                onClose={() => setNewOpen(false)}
                onStarted={(conversation) => {
                    setNewOpen(false);
                    setItems((prev) => (prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev]));
                    select(conversation.id);
                }}
            />
        </div>
    );
}
