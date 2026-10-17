'use client';

import { initials } from '../../lib/chatFormat.cjs';

const SIZES = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-[13px]',
};

export default function Avatar({ name, online = false, inactive = false, size = 'md' }) {
    return (
        <span className="relative inline-flex shrink-0">
            <span
                aria-hidden="true"
                className={`${SIZES[size] || SIZES.md} inline-flex items-center justify-center rounded-full font-semibold ${
                    inactive ? 'bg-surface-elevated text-muted' : 'bg-accent-subtle text-accent'
                }`}
            >
                {initials(name)}
            </span>
            {online && !inactive && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-[var(--color-surface)]" />
            )}
        </span>
    );
}
