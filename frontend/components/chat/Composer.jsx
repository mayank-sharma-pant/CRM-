'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';
import { checkFile, formatBytes } from '../../lib/chatMedia.cjs';

const MAX_ROWS_PX = 160;

/**
 * `files` is the `files` block of /chat/status; when it's missing or disabled the
 * attach button is hidden and the composer is text-only.
 */
export default function Composer({ disabled, maxChars = 4000, files, onSend, onSendFile, onTyping, conversationId }) {
    const t = useT();
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState(null);
    const ref = useRef(null);
    const pickerRef = useRef(null);
    const filesOn = Boolean(files?.enabled && onSendFile);
    const limit = file ? files.max_caption_chars || maxChars : maxChars;

    useEffect(() => {
        setText('');
        setFile(null);
        setFileError(null);
        ref.current?.focus();
    }, [conversationId]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
    }, [text]);

    const pick = (picked) => {
        if (!picked || !filesOn) return;
        const check = checkFile(picked, files);
        if (!check.ok) {
            setFile(null);
            setFileError(
                check.reason === 'size'
                    ? `${t('File is too large')} · ${formatBytes(check.limit)}`
                    : check.reason === 'empty'
                        ? t('File is empty')
                        : t("This file type can't be sent"),
            );
            return;
        }
        setFile(picked);
        setFileError(null);
        ref.current?.focus();
    };

    const trimmed = text.trim();
    const tooLong = trimmed.length > limit;
    const canSend = !disabled && !tooLong && (file ? true : trimmed.length > 0);

    const submit = () => {
        if (!canSend) return;
        if (file) onSendFile(file, trimmed);
        else onSend(trimmed);
        setText('');
        setFile(null);
    };

    return (
        <form
            className="border-t border-border bg-surface px-4 py-3"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
        >
            {file && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2">
                    <FileText size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-primary">{file.name}</span>
                    <span className="shrink-0 text-[11px] text-muted">{formatBytes(file.size)}</span>
                    <button type="button" onClick={() => setFile(null)} className="rounded p-0.5 text-muted hover:text-primary" aria-label={t('Remove file')}>
                        <X size={14} />
                    </button>
                </div>
            )}
            {fileError && <p className="mb-2 text-[12px] text-error" role="alert">{fileError}</p>}
            <div className="flex items-end gap-2">
                {filesOn && (
                    <>
                        <input
                            ref={pickerRef}
                            type="file"
                            accept={files.accept.join(',')}
                            className="hidden"
                            onChange={(e) => {
                                pick(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => pickerRef.current?.click()}
                            className="btn btn-ghost h-10 shrink-0 px-2.5 disabled:opacity-50"
                            aria-label={t('Attach a file')}
                        >
                            <Paperclip size={17} />
                        </button>
                    </>
                )}
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
                    onPaste={(e) => {
                        const pasted = e.clipboardData?.files?.[0];
                        if (pasted && filesOn) {
                            e.preventDefault();
                            pick(pasted);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    placeholder={disabled ? '' : file ? t('Add a caption') : t('Type a message')}
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
            {trimmed.length > limit - 500 && (
                <p className={`mt-1 text-right text-[11px] ${tooLong ? 'text-error' : 'text-muted'}`}>
                    {trimmed.length}/{limit}
                </p>
            )}
        </form>
    );
}
