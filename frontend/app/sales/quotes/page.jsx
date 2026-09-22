'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, FileText, Loader2, Plus } from 'lucide-react';
import api from '../../../services/api';

function apiDetail(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function QuotesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientFilter = searchParams.get('client_id');
  const dealFilter = searchParams.get('deal_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (clientFilter) params.client_id = clientFilter;
      if (dealFilter) params.deal_id = dealFilter;
      const res = await api.get('/quotes', { params });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      setError(apiDetail(err, 'Could not load quotations.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientFilter, dealFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadPdf = async (quote) => {
    setBusyId(quote.id);
    try {
      const res = await api.get(`/quotes/${quote.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quote_number || 'quote'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiDetail(err, 'Could not download PDF.'));
    } finally {
      setBusyId(null);
    }
  };

  const newHref = (() => {
    const q = new URLSearchParams();
    if (clientFilter) q.set('client_id', clientFilter);
    if (dealFilter) q.set('deal_id', dealFilter);
    const s = q.toString();
    return s ? `/sales/quotes/new?${s}` : '/sales/quotes/new';
  })();

  return (
    <div className="min-h-full bg-page pb-10">
      <div className="bg-surface border-b border-border px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-primary">Quotations</h1>
            <p className="text-sm text-muted mt-1">Create plan-based quotes and download PDFs for clients.</p>
          </div>
          <Link
            href={newHref}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold"
          >
            <Plus size={16} />
            New quotation
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-muted">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <FileText className="mx-auto text-muted mb-3" size={28} />
            <p className="text-sm text-secondary mb-4">No quotations yet.</p>
            <Link href={newHref} className="text-sm font-semibold text-accent hover:underline">
              Create your first quotation
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((q) => (
              <li key={q.id} className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{q.quote_number}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{q.status}</span>
                  </div>
                  <div className="text-sm text-secondary mt-1">
                    {q.plan_name || q.title || 'Quotation'} · {money(q.total)}
                    {q.billing_interval === 'monthly' ? ' / mo' : ''}
                  </div>
                  {(q.project || q.website) && (
                    <div className="text-xs text-muted mt-1">
                      {[q.project, q.website].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadPdf(q)}
                    disabled={busyId === q.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface-elevated disabled:opacity-50"
                  >
                    {busyId === q.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    PDF
                  </button>
                  {q.deal_id && (
                    <button
                      type="button"
                      onClick={() => router.push(`/sales/deals/${q.deal_id}`)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border"
                    >
                      Deal
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SalesQuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <QuotesInner />
    </Suspense>
  );
}
