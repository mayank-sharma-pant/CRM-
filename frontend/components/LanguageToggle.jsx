'use client';

import { Languages } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

/**
 * EN / हिं locale toggle for the sales-loop UI (Phase 7.4).
 * `isOpen` mirrors the sidebar's expanded/collapsed state.
 */
export default function LanguageToggle({ isOpen = true }) {
    const { locale, toggleLocale } = useLocale();

    return (
        <button
            type="button"
            onClick={toggleLocale}
            aria-label={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}
            title={locale === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-secondary hover:bg-surface-elevated hover:text-primary transition-colors"
        >
            <Languages size={16} strokeWidth={1.75} className="text-muted shrink-0" />
            {isOpen && (
                <span className="text-[13px] font-medium flex-1 text-left">
                    {locale === 'en' ? 'English' : 'हिन्दी'}
                </span>
            )}
            {isOpen && (
                <span className="text-[11px] font-semibold text-accent">
                    {locale === 'en' ? 'हिं' : 'EN'}
                </span>
            )}
        </button>
    );
}
