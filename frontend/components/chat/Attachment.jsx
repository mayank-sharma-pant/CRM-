'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Film, Music } from 'lucide-react';
import { useT } from '../../contexts/LocaleContext';
import { attachmentLabel, formatBytes } from '../../lib/chatMedia.cjs';

function FileCard({ attachment, mine, note }) {
    const t = useT();
    const Icon = attachment.category === 'video' ? Film : attachment.category === 'audio' ? Music : FileText;
    const body = (
        <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mine ? 'bg-white/20' : 'bg-surface-elevated'}`}>
                <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{attachment.filename || t(attachmentLabel(attachment.category))}</span>
                <span className={`block text-[11px] ${mine ? 'opacity-80' : 'text-muted'}`}>
                    {note || formatBytes(attachment.size)}
                </span>
            </span>
            {attachment.url && <Download size={16} className="shrink-0 opacity-80" aria-hidden="true" />}
        </>
    );
    const className = `flex w-64 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
        mine ? 'bg-accent text-inverse' : 'border border-border bg-surface text-primary'
    }`;
    if (!attachment.url) return <div className={className}>{body}</div>;
    return (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className={`${className} hover:opacity-90`} aria-label={`${t('Download')} ${attachment.filename || ''}`}>
            {body}
        </a>
    );
}

/**
 * Renders a message attachment. Download links expire; on a load error the parent is
 * asked once for a fresh link (`onBroken`), and if that fails too a download card is shown.
 */
export default function Attachment({ attachment, mine, onBroken }) {
    const t = useT();
    const [failedUrl, setFailedUrl] = useState(null);
    const [askedFor, setAskedFor] = useState(null);

    useEffect(() => {
        setFailedUrl(null);
    }, [attachment.url]);

    const onError = () => {
        setFailedUrl(attachment.url);
        if (askedFor !== attachment.id && onBroken) {
            setAskedFor(attachment.id);
            onBroken(attachment.id);
        }
    };

    if (!attachment.url || failedUrl === attachment.url) {
        const note = attachment.url ? t('File unavailable') : null;
        return <FileCard attachment={attachment} mine={mine} note={note} />;
    }

    if (attachment.category === 'image') {
        return (
            <a href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={t('Open full size')}>
                <img
                    src={attachment.url}
                    alt={attachment.filename || t('Photo')}
                    loading="lazy"
                    onError={onError}
                    className="max-h-72 max-w-full rounded-2xl border border-border object-contain"
                />
            </a>
        );
    }
    if (attachment.category === 'video') {
        return (
            <video
                src={attachment.url}
                controls
                preload="metadata"
                onError={onError}
                className="max-h-72 max-w-full rounded-2xl border border-border bg-black"
            />
        );
    }
    if (attachment.category === 'audio') {
        return (
            <div className={`rounded-2xl px-2 py-1.5 ${mine ? 'bg-accent' : 'border border-border bg-surface'}`}>
                <audio src={attachment.url} controls preload="none" onError={onError} className="max-w-full" aria-label={attachment.filename || t('Audio')} />
            </div>
        );
    }
    return <FileCard attachment={attachment} mine={mine} />;
}
