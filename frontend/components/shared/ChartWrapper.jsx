'use client';

import { cloneElement, isValidElement } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Wraps Recharts charts. Prefer `chartWidth` + `chartHeight` (fixed px) so charts render reliably
 * in flex layouts and in Playwright (ResponsiveContainer can measure 0×0 otherwise).
 * Falls back to ResponsiveContainer when dimensions are not fixed.
 */
export default function ChartWrapper({
    children,
    width = '100%',
    height = '100%',
    className = '',
    minWidth = 120,
    initialDimension = { width: 640, height: 360 },
    chartWidth,
    chartHeight,
    ...props
}) {
    if (typeof chartWidth === 'number' && typeof chartHeight === 'number' && isValidElement(children)) {
        return (
            <div className={`w-full overflow-x-auto ${className}`.trim()}>
                {cloneElement(children, { width: chartWidth, height: chartHeight })}
            </div>
        );
    }

    return (
        <ResponsiveContainer
            width={width}
            height={height}
            minWidth={minWidth}
            initialDimension={initialDimension}
            className={className}
            {...props}
        >
            {children}
        </ResponsiveContainer>
    );
}
