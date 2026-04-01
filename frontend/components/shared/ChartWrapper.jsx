'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * A client-side forced wrapper for Recharts ResponsiveContainer.
 * Resolves Next.js 15 App router rendering bugs where ResizeObserver evaluates height as 0
 * by delaying render until the component is fully mounted in the browser.
 */
export default function ChartWrapper({ children, width = "100%", height = "100%", className = "", ...props }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        // Return a placeholder div with the same dimensions to prevent layout shift
        return <div style={{ width, height }} className={className} />;
    }

    return (
        <ResponsiveContainer width={width} height={height} className={className} {...props}>
            {children}
        </ResponsiveContainer>
    );
}
