'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-page px-6">
            <div className="max-w-md w-full bg-surface border border-border rounded-md p-8 text-center">
                <div className="text-[11px] font-black uppercase tracking-widest text-muted">404</div>
                <h1 className="mt-2 text-[20px] font-black tracking-tight text-primary">Page not found</h1>
                <p className="mt-2 text-[13px] font-bold text-secondary">
                    The page you’re looking for doesn’t exist or has moved.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-md border border-border bg-surface-elevated text-[12px] font-black uppercase tracking-widest text-secondary hover:bg-surface transition-colors"
                    >
                        Go home
                    </Link>
                    <Link
                        href="/login"
                        className="px-4 py-2 rounded-md border border-accent/20 bg-accent/10 text-[12px] font-black uppercase tracking-widest text-accent hover:bg-accent/15 transition-colors"
                    >
                        Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

