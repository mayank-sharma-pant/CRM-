'use client';

import { useEffect } from 'react';
import './globals.css';

// Catches crashes above the page-level ErrorBoundary (providers, call overlay, root layout),
// which would otherwise show Next's bare "Application error" screen. Replaces the root layout,
// so it renders its own <html> and <body>.
export default function GlobalError({ error }) {
    useEffect(() => {
        console.error('GlobalError caught:', error);
    }, [error]);

    return (
        <html lang="en">
            <body className="antialiased">
                <div className="min-h-screen flex items-center justify-center bg-page px-4">
                    <div className="max-w-md w-full bg-surface rounded-xl border border-border shadow-lg p-8 text-center">
                        <h1 className="text-lg font-bold text-primary mb-2">Something went wrong</h1>
                        <p className="text-sm text-secondary mb-6">
                            An unexpected error occurred. Reloading the page usually fixes it.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
                            >
                                Reload page
                            </button>
                            <button
                                type="button"
                                onClick={() => { window.location.href = '/'; }}
                                className="px-4 py-2 bg-surface-elevated border border-border text-secondary rounded-lg text-sm font-semibold hover:bg-surface transition-all"
                            >
                                Go home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
