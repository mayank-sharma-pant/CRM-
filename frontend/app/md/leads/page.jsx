'use client';

import { useState, useEffect } from 'react';
import { MOCK_DATA } from '../../../services/mockData';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Users, Filter, Calendar } from 'lucide-react';

export default function MDLeadsPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA['/md/leads']);
        }, 500);
    }, []);

    if (!data) return <div className="p-12 text-center">Loading Leads Analytics...</div>;

    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[30px] font-semibold text-slate-900 dark:text-white">Leads Overview</h1>
                    <p className="text-slate-500 mt-1">Aggregated pipeline and conversion analytics.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
                {data.kpis.map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[12px] font-bold uppercase text-slate-500">{kpi.label}</span>
                            <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{kpi.change}</span>
                        </div>
                        <div className="text-[32px] font-bold text-slate-900 dark:text-white">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-[18px] font-semibold mb-6 text-slate-900 dark:text-white">Funnel Stage Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.funnel} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-[18px] font-semibold mb-6 text-slate-900 dark:text-white">Lead Source Mix</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                    {data.sourceBreakdown.map((entry, index) => (
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
