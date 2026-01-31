'use client';

import { createContext, useContext } from 'react';

/**
 * Theme Context - Light-only mode
 * 
 * Editorial × Engineering design uses light theme exclusively.
 * This context is kept for backwards compatibility but always returns 'light'.
 */

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => { },
});

export function ThemeProvider({ children }) {
    // Light-only mode - no toggling
    return (
        <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => { } }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
