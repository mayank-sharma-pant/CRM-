'use client';

import { useState, useEffect } from 'react';
import { MOCK_DATA } from '../../../services/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Briefcase, TrendingUp } from 'lucide-react';

export default function MDClientsPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA['/md/clients']);
        }, 500);
    }, []);

    if (!data) return <div className="p-12 text-center">Loading Client Analytics...</div>;

    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[30px] font-semibold text-slate-900 dark:text-white">Client Intelligence</h1>
                    <p className="text-slate-500 mt-1">Client growth, retention, and health metrics.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
                {data.kpis.map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[12px] font-bold uppercase text-slate-500">{kpi.label}</span>
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${kpi.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>{kpi.change}</span>
                        </div>
                        <div className="text-[32px] font-bold text-slate-900 dark:text-white">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-[18px] font-semibold mb-6 text-slate-900 dark:text-white">Client Growth Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.growthTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-[18px] font-semibold mb-6 text-slate-900 dark:text-white">Client Health Distribution</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.healthDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                                    {data.healthDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Legend verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
