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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-elevated hover:text-primary transition-all duration-200"
        >
            <Languages size={20} strokeWidth={1.5} className="text-muted shrink-0" />
            {isOpen && (
                <span className="text-sm font-medium flex-1 text-left">
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
