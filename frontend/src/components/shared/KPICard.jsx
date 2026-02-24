'use client';

import { LucideIcon } from 'lucide-react';

/**
 * KPI CARD
 * 
 * A unified, high-density metric display for all dashboard views.
 * Supports trends, icons, and sub-values.
 */
export default function KPICard({
    label,
    value,
    subValue,
    icon: Icon,
    trend,
    change,
    onClick,
    color = "text-primary",
    variant = "default"
}) {
    const isMD = variant === 'md';

    if (isMD) {
        return (
            <div
                onClick={onClick}
                className={`flex flex-col justify-between bg-surface dark:bg-slate-900 h-[100px] rounded-lg border border-border p-4 ${onClick ? 'hover:border-accent hover:shadow-sm cursor-pointer' : ''} transition-all overflow-hidden`}
            >
                <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted opacity-80">{label}</span>
                    {change && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${getTrendCompactColor(trend)}`}>
                            {getTrendArrow(trend)} {change}
                        </div>
                    )}
                </div>
                <div className="flex items-baseline gap-2 pb-0.5">
                    <span className={`text-[28px] font-bold tracking-tight leading-none ${color}`}>{value}</span>
                    {subValue && <span className="text-[11px] text-muted font-medium">{subValue}</span>}
                </div>
            </div>
        );
    }

    // Default compact variant
    return (
        <div
            onClick={onClick}
            className={`bg-surface dark:bg-slate-900 rounded border border-border p-4 flex items-center justify-between ${onClick ? 'cursor-pointer hover:bg-surface-elevated transition-colors' : ''}`}
        >
            <div>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider opacity-80">{label}</p>
                <div className={`text-xl font-bold mt-0.5 tracking-tight ${color}`}>{value}</div>
                <p className="text-[11px] text-muted mt-0.5 font-medium">{subValue}</p>
            </div>
            {Icon && (
                <div className="p-2 bg-surface-elevated text-muted rounded">
                    <Icon size={18} />
                </div>
            )}
        </div>
    );
}

// --- HELPERS ---

function getTrendCompactColor(trend) {
    if (trend === 'up') return 'text-success bg-success/10';
    if (trend === 'down') return 'text-error bg-error/10';
    return 'text-muted bg-surface-elevated';
}

function getTrendArrow(trend) {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '•';
}
