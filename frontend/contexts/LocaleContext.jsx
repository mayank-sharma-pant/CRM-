'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translate, SUPPORTED_LOCALES } from '../lib/i18n';

const LocaleContext = createContext({
    locale: 'en',
    setLocale: () => { },
    toggleLocale: () => { },
    t: (s) => s,
});

const STORAGE_KEY = 'crm_locale';

export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LOCALES.includes(stored)) {
            setLocaleState(stored);
            document.documentElement.lang = stored;
        }
    }, []);

    const setLocale = (next) => {
        if (!SUPPORTED_LOCALES.includes(next)) return;
        setLocaleState(next);
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
    };

    const toggleLocale = () => setLocale(locale === 'en' ? 'hi' : 'en');

    const t = (source) => translate(locale, source);

    if (!mounted) {
        // Match ThemeContext: render English default pre-hydration to avoid mismatch.
        return (
            <LocaleContext.Provider value={{ locale: 'en', setLocale, toggleLocale, t: (s) => translate('en', s) }}>
                {children}
            </LocaleContext.Provider>
        );
    }

    return (
        <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;
