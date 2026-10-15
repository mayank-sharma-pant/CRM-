'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';

const MAX_ROWS_PX = 160;

export default function Composer({ disabled, maxChars = 4000, onSend, onTyping, conversationId }) {
    const t = useT();
    const [text, setText] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        setText('');
        ref.current?.focus();
    }, [conversationId]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
    }, [text]);

    const trimmed = text.trim();
    const tooLong = trimmed.length > maxChars;
    const canSend = !disabled && trimmed.length > 0 && !tooLong;

    const submit = () => {
        if (!canSend) return;
        onSend(trimmed);
        setText('');
    };

    return (
        <form
            className="border-t border-border bg-surface px-4 py-3"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
        >
            <div className="flex items-end gap-2">
                <label className="sr-only" htmlFor={`composer-${conversationId}`}>{t('Type a message')}</label>
                <textarea
                    id={`composer-${conversationId}`}
                    ref={ref}
                    rows={1}
                    value={text}
                    disabled={disabled}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (e.target.value.trim()) onTyping();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    placeholder={disabled ? '' : t('Type a message')}
                    className="input min-h-[40px] flex-1 resize-none py-2 leading-6"
                />
                <button
                    type="submit"
                    disabled={!canSend}
                    className="btn btn-primary h-10 shrink-0 px-3 disabled:opacity-50"
                    aria-label={t('Send')}
                >
                    <SendHorizontal size={16} />
                </button>
            </div>
            {trimmed.length > maxChars - 500 && (
                <p className={`mt-1 text-right text-[11px] ${tooLong ? 'text-error' : 'text-muted'}`}>
                    {trimmed.length}/{maxChars}
                </p>
            )}
        </form>
    );
}
