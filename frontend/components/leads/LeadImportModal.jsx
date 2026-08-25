'use client';

import { useState } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import api from '../../services/api';

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source' },
  { key: 'service_type', label: 'Service type' },
];

const NONE = '__none__';

export default function LeadImportModal({ isOpen, onClose, onRefresh }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setError(null);
    setLoading(false);
    setCommitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const postImport = (path, mappingOverride) => {
    const fd = new FormData();
    fd.append('file', file);
    const payload = mappingOverride || mapping;
    const cleaned = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (v && v !== NONE) cleaned[k] = v;
    });
    fd.append('mapping', JSON.stringify(cleaned));
    return api.post(path, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const handleFile = async (e) => {
    const next = e.target.files?.[0];
    if (!next) return;
    setFile(next);
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', next);
      const res = await api.post('/import/leads/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeaders(res.data.headers || []);
      setMapping(res.data.suggested_mapping || {});
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not read CSV.');
    } finally {
      setLoading(false);
    }
  };

  const remap = async (nextMapping) => {
    setMapping(nextMapping);
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postImport('/import/leads/preview', nextMapping);
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not preview CSV.');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    setCommitting(true);
    setError(null);
    try {
      const res = await postImport('/import/leads/commit');
      onRefresh?.();
      close();
      return res.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed.');
    } finally {
      setCommitting(false);
    }
  };

  const counts = preview?.counts || { new: 0, duplicate: 0, invalid: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Import leads from CSV</h2>
          <button type="button" onClick={close} aria-label="Close" className="text-slate-500 hover:text-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Upload size={14} />
            <input type="file" accept=".csv,text/csv" onChange={handleFile} />
          </label>
          {loading && <Loader2 className="animate-spin" size={16} />}
          {error && <p className="text-xs text-red-600">{typeof error === 'string' ? error : 'Import failed.'}</p>}
          {headers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((field) => (
                <label key={field.key} className="text-[11px] font-bold uppercase tracking-tight text-slate-500">
                  {field.label}{field.key === 'name' ? ' *' : ''}
                  <select
                    className="mt-1 w-full h-8 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    value={mapping[field.key] || NONE}
                    onChange={(e) => remap({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value={NONE}>— skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {preview && (
            <div>
              <p className="text-xs text-slate-600 mb-2">
                {counts.new} new · {counts.duplicate} duplicate · {counts.invalid} invalid
              </p>
              <div className="max-h-56 overflow-auto border border-slate-200 dark:border-slate-700 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((row) => (
                      <tr key={row.index} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="p-2">{row.status}</td>
                        <td className="p-2">{row.values.name}</td>
                        <td className="p-2">{row.values.email}</td>
                        <td className="p-2">{row.values.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-8 px-3 text-xs font-semibold border rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!preview || counts.new < 1 || committing}
            className="h-8 px-3 text-xs font-semibold rounded-md bg-accent text-white disabled:opacity-50"
          >
            {committing ? 'Importing…' : `Import ${counts.new} new`}
          </button>
        </div>
      </div>
    </div>
  );
}
