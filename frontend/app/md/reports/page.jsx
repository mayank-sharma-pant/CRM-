'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Filter, DollarSign, Users, Target, CheckCircle, Briefcase, BarChart3,
} from 'lucide-react';

function KpiCard({ label, value, icon: Icon, prefix = '', suffix = '', subtitle }) {
  return (
    <div className="panel p-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-accent" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight text-primary tabular-nums leading-tight">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </div>
          <p className="text-[12px] text-muted mt-0.5">{label}</p>
          {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, count, total, barClass }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium text-secondary w-28 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-semibold text-primary w-10 text-right tabular-nums">{count}</span>
      <span className="text-[11px] text-muted w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

const INV_STATUS_BADGE = {
  Paid: 'badge-success',
  Overdue: 'badge badge-neutral text-error',
  Pending: 'badge badge-neutral',
  Draft: 'badge-neutral',
  Cancelled: 'badge-neutral',
};

export default function CustomReportsPage() {
  const { user } = useAuth();
  const canSave = user?.role === 'admin' || user?.role === 'md';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.post('/reports', {
        name: saveName.trim(),
        report_type: 'leads_invoices',
        filters: {
          start_date: startDate || null,
          end_date: endDate || null,
          source: source === 'All' ? null : source,
          service_type: serviceType === 'All' ? null : serviceType,
          group_by: 'source',
        },
      });
      setSaveName('');
      setSaveMessage('Saved. Open Saved reports to re-run or pin it.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSaveMessage(typeof detail === 'string' ? detail : 'Could not save report.');
    } finally {
      setSaving(false);
    }
  };

  const kpis = data?.kpis || {};
  const chartData = data?.chartData || [];
  const gridData = data?.gridData || [];
  const totalLeads = kpis.totalLeads || 0;
  const winRate = totalLeads > 0 ? Math.round(((kpis.convertedLeads || 0) / totalLeads) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Company-wide revenue and pipeline</p>
        </div>
      </div>

      <div className="page-body space-y-5">
        <div className="panel p-4 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-secondary">
            <Filter size={14} className="text-muted" />
            Filters
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1" htmlFor="md-report-start">Start date</label>
              <input id="md-report-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1" htmlFor="md-report-end">End date</label>
              <input id="md-report-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1" htmlFor="md-report-source">Lead source</label>
              <select id="md-report-source" value={source} onChange={(e) => setSource(e.target.value)} className="input">
                <option value="All">All sources</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Partner">Partner</option>
                <option value="Organic Search">Organic Search</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1" htmlFor="md-report-product">Product line</label>
              <select id="md-report-product" value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="input">
                <option value="All">All products</option>
                <option value="Solar Installation">Solar Installation</option>
                <option value="Battery Storage">Battery Storage</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Commercial">Commercial</option>
                <option value="Upgrades">Upgrades</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3 flex-wrap pt-1">
            {canSave && (
              <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="md-save-name">Report name</label>
                <input
                  id="md-save-name"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Name this report"
                  className="input"
                />
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving…' : 'Save report'}
                </button>
                <Link href="/reports" className="text-[12px] font-medium text-accent hover:underline">
                  Saved reports
                </Link>
              </form>
            )}
            <button type="button" onClick={handleClearFilters} className="btn btn-secondary">
              Clear filters
            </button>
          </div>
          {saveMessage && <p className="text-[12px] text-muted">{saveMessage}</p>}
        </div>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 flex items-center justify-between" role="alert">
            <p className="text-sm text-error">{error}</p>
            <button type="button" onClick={fetchReport} className="text-[12px] font-medium text-error underline">
              Retry
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-[13px] text-muted animate-pulse">Loading report…</span>
          </div>
        ) : data ? (
          <>
            <section className="space-y-3">
              <h2 className="text-[13px] font-medium text-secondary">Key metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Total revenue"
                  value={Math.round(kpis.totalRevenue || 0)}
                  icon={DollarSign}
                  prefix="₹"
                  subtitle={`Across ${kpis.totalInvoices || 0} invoices`}
                />
                <KpiCard label="Total leads" value={totalLeads} icon={Users} subtitle="Pipeline opportunities" />
                <KpiCard
                  label="Converted"
                  value={kpis.convertedLeads || 0}
                  icon={Target}
                  subtitle={`${winRate}% win rate`}
                />
                <KpiCard
                  label="Active filter"
                  value={gridData.length}
                  icon={Briefcase}
                  subtitle={`${source === 'All' ? 'All sources' : source} · ${serviceType === 'All' ? 'All products' : serviceType}`}
                />
              </div>
            </section>

            {chartData.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[13px] font-medium text-secondary flex items-center gap-2">
                  <BarChart3 size={14} className="text-muted" />
                  Breakdown
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="panel p-4">
                    <h3 className="text-[13px] font-medium text-secondary mb-4">Revenue by segment</h3>
                    <div className="space-y-3">
                      {[...chartData]
                        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                        .map((item) => {
                          const maxRev = Math.max(...chartData.map((d) => d.revenue || 0), 1);
                          return (
                            <BreakdownRow
                              key={item.name}
                              label={item.name || 'Unknown'}
                              count={Math.round(item.revenue || 0)}
                              total={maxRev}
                              barClass="bg-accent"
                            />
                          );
                        })}
                    </div>
                  </div>
                  <div className="panel p-4">
                    <h3 className="text-[13px] font-medium text-secondary mb-4">Leads by segment</h3>
                    <div className="space-y-3">
                      {[...chartData]
                        .sort((a, b) => (b.leads || 0) - (a.leads || 0))
                        .map((item) => (
                          <BreakdownRow
                            key={item.name}
                            label={item.name || 'Unknown'}
                            count={item.leads || 0}
                            total={totalLeads || 1}
                            barClass="bg-success"
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-[13px] font-medium text-secondary flex items-center gap-2">
                <CheckCircle size={14} className="text-muted" />
                Transactions
                <span className="text-[11px] text-muted font-normal">Top 50</span>
              </h2>
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-elevated/40">
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Invoice</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Client</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Date</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Source</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Product</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted">Status</th>
                        <th className="px-4 py-2.5 text-[12px] font-medium text-muted text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {gridData.length > 0 ? (
                        gridData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-muted">{row.id}</td>
                            <td className="px-4 py-3 font-medium text-primary">{row.client}</td>
                            <td className="px-4 py-3 text-muted text-[12px]">{row.date}</td>
                            <td className="px-4 py-3 text-muted text-[12px]">{row.source}</td>
                            <td className="px-4 py-3 text-muted text-[12px]">{row.service_type}</td>
                            <td className="px-4 py-3">
                              <span className={INV_STATUS_BADGE[row.status] || 'badge-neutral'}>{row.status}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                              ₹{(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-muted text-[13px]">
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
        ) : null}
      </div>
    </div>
  );
}
