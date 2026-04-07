'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  Filter, DollarSign, Users, Target, CheckCircle, Briefcase,
  AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime, frame;
    const animate = (time) => {
      if (!startTime) startTime = time;
      const pct = Math.min((time - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 4);
      setCount(Math.floor(end * ease));
      if (pct < 1) frame = requestAnimationFrame(animate);
      else setCount(end);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);
  return count;
}

function KpiCard({ label, value, icon: Icon, color, bgColor, prefix = '', suffix = '', subtitle }) {
  const animVal = useCountUp(value || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon size={18} className={color} strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-0.5">
        {prefix}{typeof value === 'number' && value >= 1000 ? animVal.toLocaleString() : animVal}{suffix}
      </div>
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function BreakdownRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-28 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-8 text-right">{count}</span>
      <span className="text-[10px] text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

const INV_STATUS_STYLE = {
  Paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

export default function CustomReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [source, setSource] = useState('All');
  const [serviceType, setServiceType] = useState('All');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (source && source !== 'All') params.append('source', source);
      if (serviceType && serviceType !== 'All') params.append('service_type', serviceType);
      params.append('group_by', 'source');

      const res = await api.get(`/md/reports/custom?${params.toString()}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, source, serviceType]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSource('All');
    setServiceType('All');
  };

  const kpis = data?.kpis || {};
  const chartData = data?.chartData || [];
  const gridData = data?.gridData || [];
  const totalLeads = kpis.totalLeads || 0;
  const winRate = totalLeads > 0 ? Math.round(((kpis.convertedLeads || 0) / totalLeads) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
            <BarChart3 size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Executive Reports</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Company-wide revenue &amp; pipeline insights</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Filter size={14} className="text-slate-400" />
            Filters
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Lead Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all">
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
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">Product Line</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all">
                <option value="All">All Products</option>
                <option value="Solar Installation">Solar Installation</option>
                <option value="Battery Storage">Battery Storage</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Commercial">Commercial</option>
                <option value="Upgrades">Upgrades</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-3">
            <button onClick={handleClearFilters} className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold uppercase tracking-wider px-3 py-1.5">
              Clear Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-center justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchReport} className="text-xs font-bold text-red-600 underline">Retry</button>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</span>
            </div>
          </div>
        ) : data && (
          <>
            {/* KPIs */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={14} className="text-slate-400" />
                <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Key Metrics</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total Revenue" value={Math.round(kpis.totalRevenue || 0)} icon={DollarSign} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20" prefix="₹"
                  subtitle={`Across ${kpis.totalInvoices || 0} invoices`} />
                <KpiCard label="Total Leads" value={totalLeads} icon={Users} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20"
                  subtitle="Pipeline opportunities" />
                <KpiCard label="Client" value={kpis.convertedLeads || 0} icon={Target} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                  subtitle={`${winRate}% win rate`} />
                <KpiCard label="Active Filter" value={gridData.length} icon={Briefcase} color="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-900/20"
                  subtitle={`${source === 'All' ? 'All sources' : source} · ${serviceType === 'All' ? 'All products' : serviceType}`} />
              </div>
            </section>

            {/* Source/Product Breakdown */}
            {chartData.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className="text-slate-400" />
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Breakdown</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue breakdown */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5">Revenue by Segment</h3>
                    <div className="space-y-3">
                      {chartData
                        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                        .map((item) => {
                          const maxRev = Math.max(...chartData.map(d => d.revenue || 0), 1);
                          return (
                            <BreakdownRow key={item.name} label={item.name || 'Unknown'} count={Math.round(item.revenue || 0)} total={maxRev}
                              color="bg-violet-500" />
                          );
                        })}
                    </div>
                  </motion.div>
                  {/* Leads breakdown */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5">Leads by Segment</h3>
                    <div className="space-y-3">
                      {chartData
                        .sort((a, b) => (b.leads || 0) - (a.leads || 0))
                        .map((item) => (
                          <BreakdownRow key={item.name} label={item.name || 'Unknown'} count={item.leads || 0} total={totalLeads || 1}
                            color="bg-blue-500" />
                        ))}
                    </div>
                  </motion.div>
                </div>
              </section>
            )}

            {/* Transactions Table */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={14} className="text-slate-400" />
                <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Transactions</h2>
                <span className="text-[10px] text-slate-400 ml-1">Top 50</span>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Invoice</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Client</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Date</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Source</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Product</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest">Status</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {gridData.length > 0 ? (
                        gridData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                            <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.client}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">{row.date}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">{row.source}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">{row.service_type}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${INV_STATUS_STYLE[row.status] || INV_STATUS_STYLE.Draft}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                              ₹{(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-5 py-10 text-center text-slate-400 text-xs italic">
                            No transactions match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
