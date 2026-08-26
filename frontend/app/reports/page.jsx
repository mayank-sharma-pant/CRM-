'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Filter, LayoutDashboard, Loader2, Plus, Trash2,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const REPORT_TYPES = [
  { id: 'leads_invoices', label: 'Leads & invoices' },
  { id: 'deals_pipeline', label: 'Deals pipeline' },
  { id: 'gst_invoices', label: 'GST invoices' },
];
const SOURCES = ['All', 'Website', 'Referral', 'Cold Call', 'Partner', 'Organic Search', 'Other'];
const PRODUCTS = ['All', 'Solar Installation', 'Battery Storage', 'Maintenance', 'Commercial', 'Upgrades'];
const LEAD_GROUP_BY = [
  { id: 'date', label: 'Date' },
  { id: 'source', label: 'Source' },
  { id: 'service_type', label: 'Product' },
];
const PIPELINE_GROUP_BY = [
  { id: 'stage', label: 'Stage' },
  { id: 'owner', label: 'Owner' },
];
const GST_GROUP_BY = [
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
];
const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const VIZ = [
  { id: 'kpi', label: 'KPI' },
  { id: 'chart', label: 'Chart' },
  { id: 'table', label: 'Table' },
];

function emptyFilters(type = 'leads_invoices') {
  if (type === 'deals_pipeline') {
    return { start_date: '', end_date: '', group_by: 'stage', pipeline_id: '' };
  }
  if (type === 'gst_invoices') {
    return { start_date: '', end_date: '', group_by: 'date', status: 'All' };
  }
  return { start_date: '', end_date: '', source: 'All', service_type: 'All', group_by: 'source' };
}

function filtersForApi(f, type = 'leads_invoices') {
  if (type === 'deals_pipeline') {
    return {
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      group_by: f.group_by || 'stage',
      pipeline_id: f.pipeline_id ? Number(f.pipeline_id) : null,
    };
  }
  if (type === 'gst_invoices') {
    return {
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      group_by: f.group_by || 'date',
      status: !f.status || f.status === 'All' ? null : f.status,
    };
  }
  return {
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    source: !f.source || f.source === 'All' ? null : f.source,
    service_type: !f.service_type || f.service_type === 'All' ? null : f.service_type,
    group_by: f.group_by || 'date',
  };
}

function filtersFromSaved(f, type = 'leads_invoices') {
  if (type === 'deals_pipeline') {
    return {
      start_date: f?.start_date || '',
      end_date: f?.end_date || '',
      group_by: f?.group_by || 'stage',
      pipeline_id: f?.pipeline_id ? String(f.pipeline_id) : '',
    };
  }
  if (type === 'gst_invoices') {
    return {
      start_date: f?.start_date || '',
      end_date: f?.end_date || '',
      group_by: f?.group_by || 'date',
      status: f?.status || 'All',
    };
  }
  return {
    start_date: f?.start_date || '',
    end_date: f?.end_date || '',
    source: f?.source || 'All',
    service_type: f?.service_type || 'All',
    group_by: f?.group_by || 'source',
  };
}

function KpiGrid({ kpis, reportType }) {
  let cards = [];
  if (reportType === 'deals_pipeline') {
    cards = [
      { label: 'Open deals', value: String(kpis.openDeals || 0) },
      { label: 'Open value', value: `₹${Math.round(kpis.openValue || 0).toLocaleString()}` },
      { label: 'Weighted forecast', value: `₹${Math.round(kpis.weightedForecast || 0).toLocaleString()}` },
      { label: 'Won value', value: `₹${Math.round(kpis.wonValue || 0).toLocaleString()}` },
    ];
  } else if (reportType === 'gst_invoices') {
    cards = [
      { label: 'Invoices', value: String(kpis.totalInvoices || 0) },
      { label: 'Taxable', value: `₹${Math.round(kpis.totalTaxable || 0).toLocaleString()}` },
      { label: 'CGST + SGST + IGST', value: `₹${Math.round((kpis.totalCgst || 0) + (kpis.totalSgst || 0) + (kpis.totalIgst || 0)).toLocaleString()}` },
      { label: 'Total', value: `₹${Math.round(kpis.totalAmount || 0).toLocaleString()}` },
    ];
  } else {
    const totalLeads = kpis.totalLeads || 0;
    const winRate = totalLeads > 0 ? Math.round(((kpis.convertedLeads || 0) / totalLeads) * 100) : 0;
    cards = [
      { label: 'Revenue', value: `₹${Math.round(kpis.totalRevenue || 0).toLocaleString()}` },
      { label: 'Leads', value: String(totalLeads) },
      { label: 'Converted', value: `${kpis.convertedLeads || 0} (${winRate}%)` },
      { label: 'Invoices', value: String(kpis.totalInvoices || 0) },
    ];
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{c.label}</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function ChartBars({ chartData, reportType }) {
  const countKey = reportType === 'deals_pipeline' ? 'deals' : reportType === 'gst_invoices' ? 'invoices' : 'leads';
  const max = Math.max(...(chartData || []).map((d) => d[countKey] || 0), 1);
  if (!chartData?.length) {
    return <p className="text-xs text-slate-400 italic">No breakdown for this filter.</p>;
  }
  return (
    <div className="space-y-2">
      {chartData.map((item) => {
        const pct = Math.round(((item[countKey] || 0) / max) * 100);
        return (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-28 truncate">{item.name}</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold w-8 text-right">{item[countKey] || 0}</span>
          </div>
        );
      })}
    </div>
  );
}

function GridTable({ gridData, reportType }) {
  if (!gridData?.length) {
    return <p className="text-xs text-slate-400 italic">No rows in this range.</p>;
  }
  if (reportType === 'deals_pipeline') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <th className="py-2 pr-3">Deal</th>
              <th className="py-2 pr-3">Client</th>
              <th className="py-2 pr-3">Stage</th>
              <th className="py-2 pr-3">Prob.</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {gridData.map((row, idx) => (
              <tr key={`${row.title}-${idx}`}>
                <td className="py-2 pr-3 font-semibold">{row.title}</td>
                <td className="py-2 pr-3">{row.client}</td>
                <td className="py-2 pr-3 text-xs">{row.stage}</td>
                <td className="py-2 pr-3 text-xs">{row.probability}%</td>
                <td className="py-2 text-right font-bold">₹{(row.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (reportType === 'gst_invoices') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <th className="py-2 pr-3">Invoice</th>
              <th className="py-2 pr-3">Client</th>
              <th className="py-2 pr-3">GSTIN</th>
              <th className="py-2 pr-3">CGST</th>
              <th className="py-2 pr-3">SGST</th>
              <th className="py-2 pr-3">IGST</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {gridData.map((row, idx) => (
              <tr key={`${row.invoice}-${idx}`}>
                <td className="py-2 pr-3 font-mono text-xs">{row.invoice}</td>
                <td className="py-2 pr-3">{row.client}</td>
                <td className="py-2 pr-3 text-xs">{row.buyer_gstin || '—'}</td>
                <td className="py-2 pr-3 text-xs">₹{(row.cgst || 0).toLocaleString()}</td>
                <td className="py-2 pr-3 text-xs">₹{(row.sgst || 0).toLocaleString()}</td>
                <td className="py-2 pr-3 text-xs">₹{(row.igst || 0).toLocaleString()}</td>
                <td className="py-2 text-right font-bold">₹{(row.total || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <th className="py-2 pr-3">Invoice</th>
            <th className="py-2 pr-3">Client</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {gridData.map((row, idx) => (
            <tr key={`${row.id}-${idx}`}>
              <td className="py-2 pr-3 font-mono text-xs">{row.id}</td>
              <td className="py-2 pr-3">{row.client}</td>
              <td className="py-2 pr-3 text-xs text-slate-500">{row.date}</td>
              <td className="py-2 pr-3 text-xs">{row.status}</td>
              <td className="py-2 text-right font-bold">₹{(row.amount || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WidgetBody({ viz, data, reportType }) {
  if (!data) return <p className="text-xs text-slate-400">No data.</p>;
  const rt = reportType || 'leads_invoices';
  if (viz === 'table') return <GridTable gridData={data.gridData} reportType={rt} />;
  if (viz === 'chart') return <ChartBars chartData={data.chartData} reportType={rt} />;
  return <KpiGrid kpis={data.kpis || {}} reportType={rt} />;
}

export default function SavedReportsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'md';

  const [filters, setFilters] = useState(emptyFilters());
  const [reportType, setReportType] = useState('leads_invoices');
  const [saveName, setSaveName] = useState('');
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [runData, setRunData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [widgetRuns, setWidgetRuns] = useState({});
  const [widgetTypes, setWidgetTypes] = useState({});
  const [viz, setViz] = useState('kpi');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState({ enabled: false, frequency: 'weekly', saved_report_id: null });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const loadLists = useCallback(async () => {
    setError(null);
    try {
      const [rRes, dRes, sRes] = await Promise.all([
        api.get('/reports'),
        api.get('/dashboards/default'),
        canEdit ? api.get('/settings/report-schedule') : Promise.resolve({ data: null }),
      ]);
      const items = rRes.data.items || [];
      setReports(items);
      setDashboard(dRes.data);
      if (sRes.data) setSchedule((prev) => ({ ...prev, ...sRes.data, frequency: sRes.data.frequency || 'weekly' }));
      const widgets = dRes.data.widgets || [];
      const runs = {};
      const types = {};
      await Promise.all(widgets.map(async (w) => {
        try {
          const run = await api.get(`/reports/${w.saved_report_id}/run`);
          runs[w.id] = run.data;
          types[w.id] = w.report?.report_type || items.find((r) => r.id === w.saved_report_id)?.report_type || 'leads_invoices';
        } catch {
          runs[w.id] = null;
        }
      }));
      setWidgetRuns(runs);
      setWidgetTypes(types);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const runPreview = async () => {
    if (!selectedId) {
      setError(canEdit ? 'Save the report, then run it.' : 'Select a saved report to run.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await api.get(`/reports/${selectedId}/run`);
      setRunData(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Run failed.');
    } finally {
      setRunning(false);
    }
  };

  const saveReport = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/reports', {
        name: saveName.trim(),
        report_type: reportType,
        filters: filtersForApi(filters, reportType),
      });
      setSaveName('');
      setSelectedId(res.data.id);
      await loadLists();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const selectReport = (report) => {
    const rt = report.report_type || 'leads_invoices';
    setSelectedId(report.id);
    setReportType(rt);
    setFilters(filtersFromSaved(report.filters, rt));
    setRunData(null);
  };

  const changeReportType = (nextType) => {
    setReportType(nextType);
    setFilters(emptyFilters(nextType));
    setRunData(null);
  };

  const saveSchedule = async () => {
    if (!canEdit) return;
    setScheduleSaving(true);
    setError(null);
    try {
      const res = await api.put('/settings/report-schedule', {
        enabled: schedule.enabled,
        frequency: schedule.frequency,
        saved_report_id: schedule.saved_report_id ? Number(schedule.saved_report_id) : null,
      });
      setSchedule((prev) => ({ ...prev, ...res.data, frequency: res.data.frequency || 'weekly' }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not save schedule.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const deleteReport = async (id) => {
    if (!canEdit) return;
    setError(null);
    try {
      await api.delete(`/reports/${id}`);
      if (selectedId === id) {
        setSelectedId(null);
        setRunData(null);
      }
      await loadLists();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Delete failed.');
    }
  };

  const downloadCsv = async () => {
    if (!selectedId) return;
    setError(null);
    try {
      const res = await api.get(`/reports/${selectedId}/csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV download failed.');
    }
  };

  const pinWidget = async () => {
    if (!canEdit || !selectedId) return;
    setError(null);
    try {
      await api.post('/dashboards/default/widgets', {
        saved_report_id: selectedId,
        visualization: viz,
      });
      await loadLists();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not add widget.');
    }
  };

  const moveWidget = async (widget, delta) => {
    if (!canEdit) return;
    try {
      await api.patch(`/dashboards/default/widgets/${widget.id}`, {
        position: (widget.position || 0) + delta,
      });
      await loadLists();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not reorder.');
    }
  };

  const removeWidget = async (id) => {
    if (!canEdit) return;
    try {
      await api.delete(`/dashboards/default/widgets/${id}`);
      await loadLists();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not remove widget.');
    }
  };

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
            <BarChart3 size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Saved reports</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Name a filter set, re-run it, export CSV, pin it on the dashboard</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button type="button" onClick={loadLists} className="text-xs font-bold text-red-600 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700 text-sm font-bold">
                  <Filter size={14} className="text-slate-400" />
                  Filters
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest col-span-2 md:col-span-3">
                    Report type
                    <select value={reportType} onChange={(e) => changeReportType(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      {REPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Start
                    <input type="date" value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    End
                    <input type="date" value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Group by
                    <select value={filters.group_by} onChange={(e) => setFilter('group_by', e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      {(reportType === 'deals_pipeline' ? PIPELINE_GROUP_BY : reportType === 'gst_invoices' ? GST_GROUP_BY : LEAD_GROUP_BY)
                        .map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </label>
                  {reportType === 'leads_invoices' && (
                    <>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Source
                        <select value={filters.source} onChange={(e) => setFilter('source', e.target.value)}
                          className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                          {SOURCES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All sources' : s}</option>)}
                        </select>
                      </label>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Product
                        <select value={filters.service_type} onChange={(e) => setFilter('service_type', e.target.value)}
                          className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                          {PRODUCTS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All products' : s}</option>)}
                        </select>
                      </label>
                    </>
                  )}
                  {reportType === 'gst_invoices' && (
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Status
                      <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
                        className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                        {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" onClick={runPreview} disabled={running}
                    className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                    {running ? 'Running…' : 'Run selected'}
                  </button>
                  <button type="button" onClick={downloadCsv} disabled={!selectedId}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-bold uppercase tracking-wider disabled:opacity-40">
                    Download CSV
                  </button>
                </div>
                {canEdit && (
                  <form onSubmit={saveReport} className="flex flex-wrap gap-2 mt-3">
                    <label className="sr-only" htmlFor="report-name">Report name</label>
                    <input id="report-name" required value={saveName} onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Name this report"
                      className="flex-1 min-w-[160px] px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    <button type="submit" disabled={saving}
                      className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </form>
                )}
              </section>

              <section className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Library</h2>
                {reports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No saved reports yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {reports.map((r) => (
                      <li key={r.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${selectedId === r.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                        <button type="button" onClick={() => selectReport(r)} className="text-left text-sm font-semibold truncate">
                          {r.name}
                          <span className="block text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                            {REPORT_TYPES.find((t) => t.id === r.report_type)?.label || r.report_type}
                          </span>
                        </button>
                        {canEdit && (
                          <button type="button" onClick={() => deleteReport(r.id)} aria-label={`Delete ${r.name}`} className="text-slate-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {runData && (
              <section className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Result</h2>
                <KpiGrid kpis={runData.kpis || {}} reportType={reportType} />
                <ChartBars chartData={runData.chartData} reportType={reportType} />
                <GridTable gridData={runData.gridData} reportType={reportType} />
              </section>
            )}

            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={14} className="text-slate-400" />
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {dashboard?.name || 'Company dashboard'}
                  </h2>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="viz">Visualization</label>
                    <select id="viz" value={viz} onChange={(e) => setViz(e.target.value)}
                      className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                      {VIZ.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                    <button type="button" onClick={pinWidget} disabled={!selectedId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40">
                      <Plus size={12} /> Pin selected
                    </button>
                  </div>
                )}
              </div>
              {!(dashboard?.widgets || []).length ? (
                <p className="text-sm text-slate-400 italic">No widgets yet. Save a report and pin it.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboard.widgets.map((w) => (
                    <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{w.title || w.report?.name || 'Widget'}</p>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">{w.visualization}</p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button type="button" onClick={() => moveWidget(w, -1)} className="text-[10px] font-bold px-2 py-1 border rounded">Up</button>
                            <button type="button" onClick={() => moveWidget(w, 1)} className="text-[10px] font-bold px-2 py-1 border rounded">Down</button>
                            <button type="button" onClick={() => removeWidget(w.id)} aria-label="Remove widget" className="text-slate-400 hover:text-red-600 px-1">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <WidgetBody viz={w.visualization} data={widgetRuns[w.id]} reportType={widgetTypes[w.id]} />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {canEdit && (
              <section className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Scheduled email</h2>
                <p className="text-xs text-slate-500">
                  Email the CSV export to all admin and MD users. Point a daily cron at POST /api/settings/report-schedule/run.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(schedule.enabled)}
                      onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    Enable schedule
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Frequency
                    <select
                      value={schedule.frequency || 'weekly'}
                      onChange={(e) => setSchedule((prev) => ({ ...prev, frequency: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Saved report
                    <select
                      value={schedule.saved_report_id || ''}
                      onChange={(e) => setSchedule((prev) => ({
                        ...prev,
                        saved_report_id: e.target.value ? Number(e.target.value) : null,
                      }))}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    >
                      <option value="">Select report…</option>
                      {reports.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {schedule.last_sent_at && (
                  <p className="text-xs text-slate-400">Last sent: {schedule.last_sent_at}</p>
                )}
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={scheduleSaving}
                  className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {scheduleSaving ? 'Saving…' : 'Save schedule'}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
