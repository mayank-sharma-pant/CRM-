'use client';
import { BarChart, Bar, Cell, XAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#10b981'];

export default function PipelineChart({ data, barSize = 16 }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return <div style={{ width: '100%', height: '120px' }} className="bg-surface-elevated/5 animate-pulse rounded" />;
    if (!data || !Array.isArray(data) || data.length === 0) return <div style={{ width: '100%', height: '120px' }} className="flex items-center justify-center text-[10px] text-muted uppercase font-bold bg-surface-elevated/5 rounded">No Data Available</div>;

    return (
        <div style={{ width: '100%', height: '120px' }}>
            <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data} barSize={barSize}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="stage" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--color-surface-elevated)', opacity: 0.5 }} contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '10px' }} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-pipeline-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
