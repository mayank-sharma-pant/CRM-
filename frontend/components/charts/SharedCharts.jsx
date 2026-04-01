'use client';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { useState, useEffect } from 'react';

// Common Pulse Placeholder
const ChartLoading = ({ height = 140 }) => <div style={{ width: '100%', height: `${height}px` }} className="bg-surface-elevated/5 animate-pulse rounded" />;

export function RetentionChart({ data }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !data) return <ChartLoading height={140} />;

    return (
        <div style={{ width: '100%', height: '140px' }}>
            <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data}>
                    <XAxis dataKey="date" hide />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: 'none', borderRadius: '4px', fontSize: '11px' }} />
                    <Line type="step" dataKey="count" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function LiquidityChart({ data }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !data) return <ChartLoading height={120} />;

    return (
        <div style={{ width: '100%', height: '120px' }}>
            <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-chart-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '10px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function RevenueTrendChart({ data, compareEnabled }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !data) return <ChartLoading height={320} />;

    return (
        <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                    <XAxis
                        dataKey="date"
                        stroke="var(--color-text-muted)"
                        fontSize={10}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="var(--color-text-muted)"
                        fontSize={10}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `₹${v / 1000}k`}
                        dx={-4}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--color-text-primary)',
                            padding: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ color: 'var(--color-accent)' }}
                        cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1.5 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-accent)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, fill: 'var(--color-accent)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                    {compareEnabled && (
                        <Line
                            type="monotone"
                            dataKey="avg"
                            stroke="var(--color-text-secondary)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            opacity={0.5}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ComponentBreakdownChart({ data }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !data) return <ChartLoading height={240} />;

    return (
        <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="0" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        stroke="var(--color-text-muted)"
                        fontSize={10}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--color-surface-elevated)', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '11px', fontWeight: '700' }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-breakdown-${index}`} fill={entry.fill || 'var(--color-accent)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
