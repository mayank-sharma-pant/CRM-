'use client';

export default function KPICard({
    label,
    value,
    subValue,
    icon: Icon,
    trend,
    change,
    onClick,
    color = 'text-primary',
    variant = 'default',
}) {
    const isMD = variant === 'md';

    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
            className={`bg-surface border border-border rounded-md p-4 ${onClick ? 'cursor-pointer hover:border-border-strong transition-colors' : ''} ${isMD ? 'h-[104px] flex flex-col justify-between' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-medium text-muted leading-tight">{label}</p>
                {change ? (
                    <span className={`text-[11px] font-medium tabular-nums ${getTrendCompactColor(trend)}`}>
                        {getTrendArrow(trend)} {change}
                    </span>
                ) : Icon ? (
                    <Icon size={15} className="text-muted shrink-0" strokeWidth={1.75} />
                ) : null}
            </div>
            <div className={isMD ? '' : 'mt-2'}>
                <div className={`font-mono text-[22px] font-semibold tracking-tight tabular-nums leading-none ${color}`}>
                    {value}
                </div>
                {subValue && (
                    <p className="text-[12px] text-muted mt-1.5">{subValue}</p>
                )}
            </div>
        </div>
    );
}

function getTrendCompactColor(trend) {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-error';
    return 'text-muted';
}

function getTrendArrow(trend) {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '·';
}
