'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function MomentumChart({ data }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div
                style={{ width: '100%', height: '220px' }}
                className="flex items-center justify-center text-[10px] text-muted uppercase font-bold bg-surface-elevated/5 rounded"
            >
                No Data Available
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            {/* Fixed viewBox size avoids ResponsiveContainer measuring 0×0 in flex/Playwright; parent scrolls on small screens. */}
            <LineChart width={720} height={220} data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px' }}
                    cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line
                    type="monotone"
                    dataKey={data.some((d) => d?.sales !== undefined) ? 'sales' : 'count'}
                    stroke="var(--color-success)"
                    strokeWidth={2.5}
                    dot={false}
                />
            </LineChart>
        </div>
    );
}
