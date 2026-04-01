'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LineChart,
    Line
} from 'recharts';
import ChartWrapper from '../../../components/shared/ChartWrapper';

import { Filter, Download, ArrowRight, DollarSign, Users, Target, CheckCircle } from 'lucide-react';

export default function CustomReportsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [source, setSource] = useState('All');
    const [serviceType, setServiceType] = useState('All');
    const [groupBy, setGroupBy] = useState('date'); // date, source, service_type

    const fetchReport = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (source && source !== 'All') params.append('source', source);
            if (serviceType && serviceType !== 'All') params.append('service_type', serviceType);
            if (groupBy) params.append('group_by', groupBy);

            const res = await api.get(`/md/reports/custom?${params.toString()}`);
            setData(res.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch report:', err);
            setError('Failed to load custom report data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, source, serviceType, groupBy]);

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSource('All');
        setServiceType('All');
        setGroupBy('date');
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-100 dark:border-red-800">
                <p>{error}</p>
                <button onClick={fetchReport} className="ml-4 underline">Retry</button>
            </div>
        );
    }

    // Chart colors matching the dashboard
    const chartColors = {
        revenue: "var(--accent)", // Typically Indigo
        leads: "var(--secondary)" // Typically Teal or Slate
    };

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-8 font-sans">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Custom Report Builder</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Dynamically segment revenue and pipeline data.</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <Filter size={16} className="text-slate-400" />
                    Report Filters
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-accent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-accent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Lead Source</label>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-accent outline-none transition-all"
                        >
                            <option value="All">All Sources</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Referral</option>
                            <option value="Cold Call">Cold Call</option>
                            <option value="Partner">Partner</option>
                            <option value="Organic Search">Organic Search</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Product Line</label>
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-accent outline-none transition-all"
                        >
                            <option value="All">All Products</option>
                            <option value="Solar Installation">Solar Installation</option>
                            <option value="Battery Storage">Battery Storage</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Upgrades">Upgrades</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-accent mb-1 uppercase tracking-wider">Group Data By</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            className="w-full px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg text-sm font-medium text-indigo-800 dark:text-indigo-200 focus:ring-2 focus:ring-accent outline-none transition-all"
                        >
                            <option value="date">Timeline (Date)</option>
                            <option value="source">Lead Source</option>
                            <option value="service_type">Product Line</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleClearFilters}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-4 py-2"
                    >
                        Clear Filters
                    </button>
                    {/* Excluded Manual Refetch mostly because it fetches automatically, but could be useful */}
                </div>
            </div>

            {loading && !data ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
            ) : data && (
                <>
                    {/* Aggregated KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
                                <DollarSign size={16} /> Filtered Revenue
                            </div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                ${data.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">Across {data.kpis.totalInvoices} invoices</div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
                                <Users size={16} /> Generated Leads
                            </div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                {data.kpis.totalLeads.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">New opportunities</div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
                                <CheckCircle size={16} /> Converted Deals
                            </div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                {data.kpis.convertedLeads.toLocaleString()}
                            </div>
                            <div className="text-xs text-emerald-500 font-medium mt-2">
                                {data.kpis.totalLeads > 0 ? Math.round((data.kpis.convertedLeads / data.kpis.totalLeads) * 100) : 0}% Win Rate
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl text-white flex flex-col justify-center shadow-lg">
                            <h3 className="text-lg font-semibold mb-1">Dynamic Summary</h3>
                            <p className="text-sm opacity-90 leading-relaxed">
                                You are viewing <span className="font-bold">{source}</span> leads for <span className="font-bold">{serviceType}</span> services {startDate ? `from ${startDate}` : ''}.
                            </p>
                        </div>
                    </div>

                    {/* Chart Viewer */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {groupBy === 'date' ? 'Timeline Overview' : `Breakdown by ${groupBy === 'source' ? 'Lead Source' : 'Product Line'}`}
                            </h3>
                            <button
                                onClick={() => {
                                    // Basic export utility (stub)
                                    alert("Exporting PDF...");
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>

                        <div className="h-80 w-full mb-4">
                            {data.chartData && data.chartData.length > 0 ? (
                                <ChartWrapper width="100%" height="100%">
                                    {groupBy === 'date' ? (
                                        <LineChart data={data.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={{ stroke: 'var(--border)' }}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                tickFormatter={(value) => `₹${value / 1000}k`}
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                                                itemStyle={{ color: 'var(--text)' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            <Line yAxisId="left" type="monotone" name="Revenue" dataKey="revenue" stroke={chartColors.revenue} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            <Line yAxisId="right" type="monotone" name="New Leads" dataKey="leads" stroke={chartColors.leads} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                        </LineChart>
                                    ) : (
                                        <BarChart data={data.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={{ stroke: 'var(--border)' }}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                tickFormatter={(value) => `₹${value / 1000}k`}
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                                                itemStyle={{ color: 'var(--text)' }}
                                                cursor={{ fill: 'var(--surface-elevated)' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            <Bar yAxisId="left" name="Revenue" dataKey="revenue" fill={chartColors.revenue} radius={[4, 4, 0, 0]} maxBarSize={60} />
                                            <Bar yAxisId="right" name="New Leads" dataKey="leads" fill={chartColors.leads} radius={[4, 4, 0, 0]} maxBarSize={60} />
                                        </BarChart>
                                    )}
                                </ChartWrapper>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <BarChart size={48} className="mb-4 opacity-20" />
                                    <p>No data available for these filters.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Grid */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Underlying Transactions (Top 50 matches)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                        <th className="px-6 py-3 font-medium">Invoice ID</th>
                                        <th className="px-6 py-3 font-medium">Client</th>
                                        <th className="px-6 py-3 font-medium">Date</th>
                                        <th className="px-6 py-3 font-medium">Source</th>
                                        <th className="px-6 py-3 font-medium">Product</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {data.gridData && data.gridData.length > 0 ? (
                                        data.gridData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-3 font-mono text-xs">{row.id}</td>
                                                <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{row.client}</td>
                                                <td className="px-6 py-3 text-slate-500">{row.date}</td>
                                                <td className="px-6 py-3 text-slate-500">{row.source}</td>
                                                <td className="px-6 py-3 text-slate-500">{row.service_type}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${row.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            row.status === 'Overdue' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                        }`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-medium text-slate-900 dark:text-white">
                                                    ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                                No transactions match your current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
